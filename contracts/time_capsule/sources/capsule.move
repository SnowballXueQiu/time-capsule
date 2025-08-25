module time_capsule::capsule {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::vec_set::{Self, VecSet};
    use std::string::String;
    use std::option::{Self, Option};

    /// Capsule object that stores encrypted content metadata and unlock conditions
    struct Capsule has key, store {
        id: UID,
        owner: address,
        cid: String,                    // IPFS content identifier
        content_hash: vector<u8>,       // Content hash for integrity verification
        unlock_condition: UnlockCondition,
        created_at: u64,
        unlocked: bool,
    }

    /// Unlock condition structure supporting time, multisig, and payment conditions
    struct UnlockCondition has store {
        condition_type: u8,             // 1=time, 2=multisig, 3=payment
        unlock_time_ms: Option<u64>,    // Time condition
        threshold: Option<u64>,         // Multisig threshold
        approvals: VecSet<address>,     // Approved addresses
        price: Option<u64>,             // Payment amount (SUI)
        paid: bool,                     // Payment status
    }

    /// Event emitted when a capsule is created
    struct CapsuleCreated has copy, drop {
        capsule_id: address,
        owner: address,
        condition_type: u8,
    }

    /// Event emitted when a capsule is unlocked
    struct CapsuleUnlocked has copy, drop {
        capsule_id: address,
        unlocker: address,
    }

    /// Event emitted when a multisig approval is added
    struct CapsuleApproved has copy, drop {
        capsule_id: address,
        approver: address,
        current_approvals: u64,
    }

    // Error codes
    const E_INVALID_CONDITION_TYPE: u64 = 1;
    const E_UNLOCK_CONDITIONS_NOT_MET: u64 = 2;
    const E_ALREADY_UNLOCKED: u64 = 3;
    const E_UNAUTHORIZED: u64 = 4;
    const E_ALREADY_APPROVED: u64 = 5;
    const E_INSUFFICIENT_PAYMENT: u64 = 6;

    /// Create a time-based capsule
    public fun create_time_capsule(
        cid: String,
        content_hash: vector<u8>,
        unlock_time_ms: u64,
        ctx: &mut TxContext
    ): Capsule {
        let capsule = Capsule {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            cid,
            content_hash,
            unlock_condition: UnlockCondition {
                condition_type: 1,
                unlock_time_ms: option::some(unlock_time_ms),
                threshold: option::none(),
                approvals: vec_set::empty(),
                price: option::none(),
                paid: false,
            },
            created_at: tx_context::epoch_timestamp_ms(ctx),
            unlocked: false,
        };

        // Emit creation event
        sui::event::emit(CapsuleCreated {
            capsule_id: object::uid_to_address(&capsule.id),
            owner: capsule.owner,
            condition_type: 1,
        });

        capsule
    }

    /// Create a multisig capsule
    public fun create_multisig_capsule(
        cid: String,
        content_hash: vector<u8>,
        threshold: u64,
        ctx: &mut TxContext
    ): Capsule {
        let capsule = Capsule {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            cid,
            content_hash,
            unlock_condition: UnlockCondition {
                condition_type: 2,
                unlock_time_ms: option::none(),
                threshold: option::some(threshold),
                approvals: vec_set::empty(),
                price: option::none(),
                paid: false,
            },
            created_at: tx_context::epoch_timestamp_ms(ctx),
            unlocked: false,
        };

        // Emit creation event
        sui::event::emit(CapsuleCreated {
            capsule_id: object::uid_to_address(&capsule.id),
            owner: capsule.owner,
            condition_type: 2,
        });

        capsule
    }

    /// Create a paid capsule
    public fun create_paid_capsule(
        cid: String,
        content_hash: vector<u8>,
        price: u64,
        ctx: &mut TxContext
    ): Capsule {
        let capsule = Capsule {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            cid,
            content_hash,
            unlock_condition: UnlockCondition {
                condition_type: 3,
                unlock_time_ms: option::none(),
                threshold: option::none(),
                approvals: vec_set::empty(),
                price: option::some(price),
                paid: false,
            },
            created_at: tx_context::epoch_timestamp_ms(ctx),
            unlocked: false,
        };

        // Emit creation event
        sui::event::emit(CapsuleCreated {
            capsule_id: object::uid_to_address(&capsule.id),
            owner: capsule.owner,
            condition_type: 3,
        });

        capsule
    }

    /// Approve a multisig capsule
    public fun approve_capsule(
        capsule: &mut Capsule,
        ctx: &mut TxContext
    ) {
        assert!(capsule.unlock_condition.condition_type == 2, E_INVALID_CONDITION_TYPE);
        assert!(!capsule.unlocked, E_ALREADY_UNLOCKED);
        
        let approver = tx_context::sender(ctx);
        assert!(!vec_set::contains(&capsule.unlock_condition.approvals, &approver), E_ALREADY_APPROVED);
        
        vec_set::insert(&mut capsule.unlock_condition.approvals, approver);
        
        // Emit approval event
        sui::event::emit(CapsuleApproved {
            capsule_id: object::uid_to_address(&capsule.id),
            approver,
            current_approvals: vec_set::size(&capsule.unlock_condition.approvals),
        });
    }

    /// Unlock a capsule
    public fun unlock_capsule(
        capsule: &mut Capsule,
        payment: Option<Coin<SUI>>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!capsule.unlocked, E_ALREADY_UNLOCKED);
        
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Verify unlock conditions based on type
        if (capsule.unlock_condition.condition_type == 1) {
            // Time-based unlock
            let unlock_time = *option::borrow(&capsule.unlock_condition.unlock_time_ms);
            assert!(current_time >= unlock_time, E_UNLOCK_CONDITIONS_NOT_MET);
        } else if (capsule.unlock_condition.condition_type == 2) {
            // Multisig unlock
            let threshold = *option::borrow(&capsule.unlock_condition.threshold);
            let current_approvals = vec_set::size(&capsule.unlock_condition.approvals);
            assert!(current_approvals >= threshold, E_UNLOCK_CONDITIONS_NOT_MET);
        } else if (capsule.unlock_condition.condition_type == 3) {
            // Payment unlock
            assert!(option::is_some(&payment), E_INSUFFICIENT_PAYMENT);
            let coin = option::extract(&mut payment);
            let required_price = *option::borrow(&capsule.unlock_condition.price);
            assert!(coin::value(&coin) >= required_price, E_INSUFFICIENT_PAYMENT);
            
            // Transfer payment to capsule owner
            transfer::public_transfer(coin, capsule.owner);
            capsule.unlock_condition.paid = true;
        };
        
        // Handle remaining payment if any
        if (option::is_some(&payment)) {
            let remaining_coin = option::extract(&mut payment);
            transfer::public_transfer(remaining_coin, sender);
        };
        option::destroy_none(payment);
        
        // Mark as unlocked
        capsule.unlocked = true;
        
        // Emit unlock event
        sui::event::emit(CapsuleUnlocked {
            capsule_id: object::uid_to_address(&capsule.id),
            unlocker: sender,
        });
    }

    // Getter functions
    public fun get_cid(capsule: &Capsule): String {
        capsule.cid
    }

    public fun get_content_hash(capsule: &Capsule): vector<u8> {
        capsule.content_hash
    }

    public fun is_unlocked(capsule: &Capsule): bool {
        capsule.unlocked
    }

    public fun get_owner(capsule: &Capsule): address {
        capsule.owner
    }
}