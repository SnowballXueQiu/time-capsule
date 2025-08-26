module time_capsule::capsule {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use std::string::String;

    /// Time capsule object
    public struct TimeCapsule has key, store {
        id: UID,
        owner: address,
        cid: String,
        content_hash: vector<u8>,
        unlock_time_ms: u64,
        unlocked: bool,
    }

    /// Create a time-based capsule
    public fun create_time_capsule(
        cid: String,
        content_hash: vector<u8>,
        unlock_time_ms: u64,
        ctx: &mut TxContext
    ) {
        let capsule = TimeCapsule {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            cid,
            content_hash,
            unlock_time_ms,
            unlocked: false,
        };
        
        transfer::public_transfer(capsule, tx_context::sender(ctx));
    }

    /// Create a multisig capsule (simplified - just creates a time capsule for now)
    public fun create_multisig_capsule(
        cid: String,
        content_hash: vector<u8>,
        threshold: u64,
        ctx: &mut TxContext
    ) {
        // For simplicity, create a time capsule that unlocks immediately
        let capsule = TimeCapsule {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            cid,
            content_hash,
            unlock_time_ms: 0, // Unlock immediately for now
            unlocked: false,
        };
        
        transfer::public_transfer(capsule, tx_context::sender(ctx));
    }

    /// Create a paid capsule (simplified - just creates a time capsule for now)
    public fun create_paid_capsule(
        cid: String,
        content_hash: vector<u8>,
        price: u64,
        ctx: &mut TxContext
    ) {
        // For simplicity, create a time capsule that unlocks immediately
        let capsule = TimeCapsule {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            cid,
            content_hash,
            unlock_time_ms: 0, // Unlock immediately for now
            unlocked: false,
        };
        
        transfer::public_transfer(capsule, tx_context::sender(ctx));
    }

    /// Unlock a capsule
    public fun unlock_capsule(
        capsule: &mut TimeCapsule,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(!capsule.unlocked, 1);
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time >= capsule.unlock_time_ms, 2);
        capsule.unlocked = true;
    }

    // Getter functions
    public fun get_cid(capsule: &TimeCapsule): String {
        capsule.cid
    }

    public fun get_content_hash(capsule: &TimeCapsule): vector<u8> {
        capsule.content_hash
    }

    public fun is_unlocked(capsule: &TimeCapsule): bool {
        capsule.unlocked
    }

    public fun get_owner(capsule: &TimeCapsule): address {
        capsule.owner
    }

    public fun get_unlock_time(capsule: &TimeCapsule): u64 {
        capsule.unlock_time_ms
    }
}