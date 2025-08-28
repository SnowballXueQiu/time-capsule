module time_capsule::capsule {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use std::vector;
    use std::string::{Self, String};

    /// Error codes
    const ENotOwner: u64 = 1;
    const EAlreadyUnlocked: u64 = 2;
    const ETimeNotReached: u64 = 3;

    /// Time Capsule struct with encryption metadata
    public struct TimeCapsule has key, store {
        id: UID,
        owner: address,
        cid: String,
        content_hash: vector<u8>,
        unlock_time_ms: u64,
        unlocked: bool,
        created_at: u64,
        // Encryption metadata
        nonce: vector<u8>,
        key_derivation_salt: vector<u8>,
    }

    /// Events
    public struct CapsuleCreated has copy, drop {
        capsule_id: address,
        owner: address,
        cid: String,
        unlock_time_ms: u64,
    }

    public struct CapsuleUnlocked has copy, drop {
        capsule_id: address,
        unlocker: address,
        unlock_time: u64,
    }

    /// Create a time-locked capsule with encryption metadata
    public entry fun create_time_capsule(
        cid: vector<u8>,
        content_hash: vector<u8>,
        nonce: vector<u8>,
        key_derivation_salt: vector<u8>,
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
            unlock_time_ms,
            unlocked: false,
            created_at: current_time,
            nonce,
            key_derivation_salt,
        };

        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleCreated {
            capsule_id,
            owner: sender,
            cid: capsule.cid,
            unlock_time_ms,
        });

        transfer::share_object(capsule);
    }

    /// Unlock a time-locked capsule
    public entry fun unlock_capsule(
        capsule: &mut TimeCapsule,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        assert!(!capsule.unlocked, EAlreadyUnlocked);
        assert!(current_time >= capsule.unlock_time_ms, ETimeNotReached);

        capsule.unlocked = true;
        
        let capsule_id = object::uid_to_address(&capsule.id);
        
        event::emit(CapsuleUnlocked {
            capsule_id,
            unlocker: tx_context::sender(ctx),
            unlock_time: current_time,
        });
    }

    /// Get capsule information (read-only)
    public fun get_capsule_info(capsule: &TimeCapsule): (
        address,    // owner
        String,     // cid
        vector<u8>, // content_hash
        u64,        // unlock_time_ms
        bool,       // unlocked
        u64,        // created_at
        vector<u8>, // nonce
        vector<u8>  // key_derivation_salt
    ) {
        (
            capsule.owner,
            capsule.cid,
            capsule.content_hash,
            capsule.unlock_time_ms,
            capsule.unlocked,
            capsule.created_at,
            capsule.nonce,
            capsule.key_derivation_salt
        )
    }

    /// Check if capsule can be unlocked
    public fun can_unlock(capsule: &TimeCapsule, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time >= capsule.unlock_time_ms
    }
}