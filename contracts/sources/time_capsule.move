module time_capsule::capsule {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::vector;
    use std::string::{Self, String};

    /// Error codes
    const ENotOwner: u64 = 1;
    const EAlreadyUnlocked: u64 = 2;
    const ETimeNotReached: u64 = 3;
    const EInsufficientApprovals: u64 = 4;
    const EInsufficientPayment: u64 = 5;
    const EAlreadyApproved: u64 = 6;
    const EInvalidUnlockCondition: u64 = 7;

    /// Unlock condition types
    const UNLOCK_TYPE_TIME: u8 = 1;
    const UNLOCK_TYPE_MULTISIG: u8 = 2;
    const UNLOCK_TYPE_PAYMENT: u8 = 3;

    /// Time Capsule struct
    public struct TimeCapsule has key, store {
        id: UID,
        owner: address,
        cid: String,
        content_hash: vector<u8>,
        unlock_condition_type: u8,
        unlock_time_ms: u64,
        multisig_threshold: u64,
        multisig_approvals: vector<address>,
        payment_amount: u64,
        payment_received: bool,
        unlocked: bool,
        created_at: u64,
    }

    /// Events
    public struct CapsuleCreated has copy, drop {
        capsule_id: address,
        owner: address,
        cid: String,
        unlock_condition_type: u8,
    }

    public struct CapsuleUnlocked has copy, drop {
        capsule_id: address,
        unlocker: address,
        unlock_time: u64,
    }

    public struct CapsuleApproved has copy, drop {
        capsule_id: address,
        approver: address,
        total_approvals: u64,
    }

    public struct PaymentReceived has copy, drop {
        capsule_id: address,
        payer: address,
        amount: u64,
    }

    /// Create a time-locked capsule
    public entry fun create_time_capsule(
        cid: vector<u8>,
        content_hash: vector<u8>,
        unlock_time_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let capsule = TimeCapsule {
            id: object::new(ctx),
            owner: sender,
            cid: string::utf8(cid),
            content_hash,
            unlock_condition_type: UNLOCK_TYPE_TIME,
            unlock_time_ms,
            multisig_threshold: 0,
            multisig_approvals: vector::empty(),
            payment_amount: 0,
            payment_received: false,
            unlocked: false,
            created_at: current_time,
        };

        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleCreated {
            capsule_id,
            owner: sender,
            cid: capsule.cid,
            unlock_condition_type: UNLOCK_TYPE_TIME,
        });

        transfer::share_object(capsule);
    }

    /// Create a multisig capsule
    public entry fun create_multisig_capsule(
        cid: vector<u8>,
        content_hash: vector<u8>,
        threshold: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let capsule = TimeCapsule {
            id: object::new(ctx),
            owner: sender,
            cid: string::utf8(cid),
            content_hash,
            unlock_condition_type: UNLOCK_TYPE_MULTISIG,
            unlock_time_ms: 0,
            multisig_threshold: threshold,
            multisig_approvals: vector::empty(),
            payment_amount: 0,
            payment_received: false,
            unlocked: false,
            created_at: current_time,
        };

        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleCreated {
            capsule_id,
            owner: sender,
            cid: capsule.cid,
            unlock_condition_type: UNLOCK_TYPE_MULTISIG,
        });

        transfer::share_object(capsule);
    }

    /// Create a payment-locked capsule
    public entry fun create_payment_capsule(
        cid: vector<u8>,
        content_hash: vector<u8>,
        payment_amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let capsule = TimeCapsule {
            id: object::new(ctx),
            owner: sender,
            cid: string::utf8(cid),
            content_hash,
            unlock_condition_type: UNLOCK_TYPE_PAYMENT,
            unlock_time_ms: 0,
            multisig_threshold: 0,
            multisig_approvals: vector::empty(),
            payment_amount,
            payment_received: false,
            unlocked: false,
            created_at: current_time,
        };

        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleCreated {
            capsule_id,
            owner: sender,
            cid: capsule.cid,
            unlock_condition_type: UNLOCK_TYPE_PAYMENT,
        });

        transfer::share_object(capsule);
    }

    /// Approve a multisig capsule
    public entry fun approve_capsule(
        capsule: &mut TimeCapsule,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(capsule.unlock_condition_type == UNLOCK_TYPE_MULTISIG, EInvalidUnlockCondition);
        assert!(!capsule.unlocked, EAlreadyUnlocked);
        assert!(!vector::contains(&capsule.multisig_approvals, &sender), EAlreadyApproved);

        vector::push_back(&mut capsule.multisig_approvals, sender);
        
        let capsule_id = object::uid_to_address(&capsule.id);
        let total_approvals = vector::length(&capsule.multisig_approvals);
        
        event::emit(CapsuleApproved {
            capsule_id,
            approver: sender,
            total_approvals,
        });
    }

    /// Unlock a time-locked capsule
    public entry fun unlock_time_capsule(
        capsule: &mut TimeCapsule,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        assert!(capsule.unlock_condition_type == UNLOCK_TYPE_TIME, EInvalidUnlockCondition);
        assert!(!capsule.unlocked, EAlreadyUnlocked);
        assert!(current_time >= capsule.unlock_time_ms, ETimeNotReached);

        capsule.unlocked = true;
        
        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleUnlocked {
            capsule_id,
            unlocker: sender,
            unlock_time: current_time,
        });
    }

    /// Unlock a multisig capsule
    public entry fun unlock_multisig_capsule(
        capsule: &mut TimeCapsule,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(capsule.unlock_condition_type == UNLOCK_TYPE_MULTISIG, EInvalidUnlockCondition);
        assert!(!capsule.unlocked, EAlreadyUnlocked);
        assert!(
            vector::length(&capsule.multisig_approvals) >= capsule.multisig_threshold,
            EInsufficientApprovals
        );

        capsule.unlocked = true;
        
        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleUnlocked {
            capsule_id,
            unlocker: sender,
            unlock_time: 0, // No time constraint for multisig
        });
    }

    /// Unlock a payment capsule
    public entry fun unlock_payment_capsule(
        capsule: &mut TimeCapsule,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let payment_value = coin::value(&payment);
        
        assert!(capsule.unlock_condition_type == UNLOCK_TYPE_PAYMENT, EInvalidUnlockCondition);
        assert!(!capsule.unlocked, EAlreadyUnlocked);
        assert!(payment_value >= capsule.payment_amount, EInsufficientPayment);

        // Transfer payment to capsule owner
        transfer::public_transfer(payment, capsule.owner);
        
        capsule.payment_received = true;
        capsule.unlocked = true;
        
        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(PaymentReceived {
            capsule_id,
            payer: sender,
            amount: payment_value,
        });
        
        event::emit(CapsuleUnlocked {
            capsule_id,
            unlocker: sender,
            unlock_time: 0, // No time constraint for payment
        });
    }

    /// Get capsule information (read-only)
    public fun get_capsule_info(capsule: &TimeCapsule): (
        address, // owner
        String,  // cid
        vector<u8>, // content_hash
        u8,      // unlock_condition_type
        u64,     // unlock_time_ms
        u64,     // multisig_threshold
        u64,     // multisig_approvals_count
        u64,     // payment_amount
        bool,    // payment_received
        bool,    // unlocked
        u64      // created_at
    ) {
        (
            capsule.owner,
            capsule.cid,
            capsule.content_hash,
            capsule.unlock_condition_type,
            capsule.unlock_time_ms,
            capsule.multisig_threshold,
            vector::length(&capsule.multisig_approvals),
            capsule.payment_amount,
            capsule.payment_received,
            capsule.unlocked,
            capsule.created_at
        )
    }

    /// Check if an address has approved a multisig capsule
    public fun has_approved(capsule: &TimeCapsule, approver: address): bool {
        vector::contains(&capsule.multisig_approvals, &approver)
    }

    /// Get all approvers for a multisig capsule
    public fun get_approvers(capsule: &TimeCapsule): vector<address> {
        capsule.multisig_approvals
    }
}