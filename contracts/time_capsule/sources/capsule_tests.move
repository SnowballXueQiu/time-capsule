#[test_only]
module time_capsule::capsule_tests {
    use time_capsule::capsule::{Self, Capsule};
    use sui::test_scenario::{Self, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use std::string;
    use std::option;

    // Test addresses
    const OWNER: address = @0xA;
    const USER1: address = @0xB;
    const USER2: address = @0xC;

    #[test]
    fun test_create_time_capsule() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create a time capsule
        let cid = string::utf8(b"QmTest123");
        let content_hash = b"hash123";
        let unlock_time = 1000000;
        
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_time_capsule(
                cid,
                content_hash,
                unlock_time,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule properties
            assert!(capsule::get_cid(&capsule) == cid, 0);
            assert!(capsule::get_content_hash(&capsule) == content_hash, 1);
            assert!(capsule::get_owner(&capsule) == OWNER, 2);
            assert!(!capsule::is_unlocked(&capsule), 3);
            
            // Transfer to owner for cleanup
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_multisig_capsule() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create a multisig capsule
        let cid = string::utf8(b"QmMultisig123");
        let content_hash = b"multisig_hash";
        let threshold = 2;
        
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_multisig_capsule(
                cid,
                content_hash,
                threshold,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule properties
            assert!(capsule::get_cid(&capsule) == cid, 0);
            assert!(capsule::get_content_hash(&capsule) == content_hash, 1);
            assert!(capsule::get_owner(&capsule) == OWNER, 2);
            assert!(!capsule::is_unlocked(&capsule), 3);
            
            // Transfer to owner for cleanup
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_paid_capsule() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create a paid capsule
        let cid = string::utf8(b"QmPaid123");
        let content_hash = b"paid_hash";
        let price = 1000;
        
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_paid_capsule(
                cid,
                content_hash,
                price,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule properties
            assert!(capsule::get_cid(&capsule) == cid, 0);
            assert!(capsule::get_content_hash(&capsule) == content_hash, 1);
            assert!(capsule::get_owner(&capsule) == OWNER, 2);
            assert!(!capsule::is_unlocked(&capsule), 3);
            
            // Transfer to owner for cleanup
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_capsule_getter_functions() {
        let mut scenario = test_scenario::begin(OWNER);
        
        let cid = string::utf8(b"QmGetter123");
        let content_hash = b"getter_hash";
        let unlock_time = 2000000;
        
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_time_capsule(
                cid,
                content_hash,
                unlock_time,
                test_scenario::ctx(&mut scenario)
            );
            
            // Test all getter functions
            let retrieved_cid = capsule::get_cid(&capsule);
            let retrieved_hash = capsule::get_content_hash(&capsule);
            let retrieved_owner = capsule::get_owner(&capsule);
            let is_unlocked = capsule::is_unlocked(&capsule);
            
            assert!(retrieved_cid == cid, 0);
            assert!(retrieved_hash == content_hash, 1);
            assert!(retrieved_owner == OWNER, 2);
            assert!(!is_unlocked, 3);
            
            // Transfer to owner for cleanup
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multisig_approval() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create multisig capsule
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_multisig_capsule(
                string::utf8(b"QmMultisigApproval"),
                b"approval_hash",
                2,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // First approval from USER1
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Second approval from USER2
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_time_unlock_success() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create a time capsule with unlock time in the past
        let unlock_time = 1000000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_time_capsule(
                string::utf8(b"QmTimeUnlock"),
                b"time_hash",
                unlock_time,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock with time after unlock time
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, unlock_time + 1000);
            sui::clock::share_for_testing(clock);
        };
        
        // Unlock the capsule
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule is unlocked
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_time_unlock_too_early() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create a time capsule with unlock time in the future
        let unlock_time = 2000000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_time_capsule(
                string::utf8(b"QmTimeUnlockFuture"),
                b"time_hash_future",
                unlock_time,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock with time before unlock time
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, unlock_time - 1000);
            sui::clock::share_for_testing(clock);
        };
        
        // Try to unlock the capsule (should fail)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multisig_unlock_success() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create multisig capsule with threshold of 2
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_multisig_capsule(
                string::utf8(b"QmMultisigUnlock"),
                b"multisig_unlock_hash",
                2,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // First approval from USER1
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Second approval from USER2
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Now unlock the capsule (should succeed)
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule is unlocked
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)]
    fun test_multisig_unlock_insufficient_approvals() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create multisig capsule with threshold of 2
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_multisig_capsule(
                string::utf8(b"QmMultisigInsufficientApprovals"),
                b"multisig_insufficient_hash",
                2,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Only one approval from USER1 (insufficient for threshold of 2)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Try to unlock the capsule (should fail)
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 5)] // E_ALREADY_APPROVED
    fun test_multisig_duplicate_approval() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create multisig capsule
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_multisig_capsule(
                string::utf8(b"QmMultisigDuplicateApproval"),
                b"multisig_duplicate_hash",
                2,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // First approval from USER1
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Try to approve again from USER1 (should fail)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_paid_unlock_success() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create paid capsule with price of 1000
        let price = 1000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_paid_capsule(
                string::utf8(b"QmPaidUnlock"),
                b"paid_unlock_hash",
                price,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Create a coin with sufficient payment
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let coin = sui::coin::mint_for_testing<sui::sui::SUI>(price, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(coin, USER1);
        };
        
        // Unlock the capsule with payment
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            let payment_coin = test_scenario::take_from_sender<sui::coin::Coin<sui::sui::SUI>>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::some(payment_coin),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule is unlocked
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 6)] // E_INSUFFICIENT_PAYMENT
    fun test_paid_unlock_insufficient_payment() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create paid capsule with price of 1000
        let price = 1000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_paid_capsule(
                string::utf8(b"QmPaidUnlockInsufficient"),
                b"paid_unlock_insufficient_hash",
                price,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Create a coin with insufficient payment
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let coin = sui::coin::mint_for_testing<sui::sui::SUI>(price - 100, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(coin, USER1);
        };
        
        // Try to unlock the capsule with insufficient payment (should fail)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            let payment_coin = test_scenario::take_from_sender<sui::coin::Coin<sui::sui::SUI>>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::some(payment_coin),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 6)] // E_INSUFFICIENT_PAYMENT
    fun test_paid_unlock_no_payment() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create paid capsule with price of 1000
        let price = 1000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_paid_capsule(
                string::utf8(b"QmPaidUnlockNoPayment"),
                b"paid_unlock_no_payment_hash",
                price,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Try to unlock the capsule without payment (should fail)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_paid_unlock_with_excess_payment() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create paid capsule with price of 1000
        let price = 1000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_paid_capsule(
                string::utf8(b"QmPaidUnlockExcess"),
                b"paid_unlock_excess_hash",
                price,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Create a coin with excess payment
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let coin = sui::coin::mint_for_testing<sui::sui::SUI>(price + 500, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(coin, USER1);
        };
        
        // Unlock the capsule with excess payment (should succeed and return change)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            let payment_coin = test_scenario::take_from_sender<sui::coin::Coin<sui::sui::SUI>>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::some(payment_coin),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            // Verify capsule is unlocked
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3)] // E_ALREADY_UNLOCKED
    fun test_unlock_already_unlocked_capsule() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Create a time capsule
        let unlock_time = 1000000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_time_capsule(
                string::utf8(b"QmAlreadyUnlocked"),
                b"already_unlocked_hash",
                unlock_time,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, unlock_time + 1000);
            sui::clock::share_for_testing(clock);
        };
        
        // First unlock (should succeed)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Try to unlock again (should fail)
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_unified_unlock_interface_integration() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Test 1: Time-based unlock
        let unlock_time = 1000000;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_time_capsule(
                string::utf8(b"QmTimeIntegration"),
                b"time_integration_hash",
                unlock_time,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, unlock_time + 1000);
            sui::clock::share_for_testing(clock);
        };
        
        // Unlock time-based capsule
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, USER1);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_unified_unlock_interface_multisig() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Test 2: Multisig unlock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_multisig_capsule(
                string::utf8(b"QmMultisigIntegration"),
                b"multisig_integration_hash",
                2,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Set up multisig approvals
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            capsule::approve_capsule(&mut capsule, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Unlock multisig capsule
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::none(),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, USER1);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_unified_unlock_interface_paid() {
        let mut scenario = test_scenario::begin(OWNER);
        
        // Test 3: Paid unlock
        let price = 500;
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let capsule = capsule::create_paid_capsule(
                string::utf8(b"QmPaidIntegration"),
                b"paid_integration_hash",
                price,
                test_scenario::ctx(&mut scenario)
            );
            sui::transfer::public_transfer(capsule, OWNER);
        };
        
        // Create and share a clock
        test_scenario::next_tx(&mut scenario, OWNER);
        {
            let mut clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));
            sui::clock::set_for_testing(&mut clock, 1000000);
            sui::clock::share_for_testing(clock);
        };
        
        // Create payment
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let coin = sui::coin::mint_for_testing<sui::sui::SUI>(price, test_scenario::ctx(&mut scenario));
            sui::transfer::public_transfer(coin, USER2);
        };
        
        // Unlock paid capsule
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let mut capsule = test_scenario::take_from_address<Capsule>(&scenario, OWNER);
            let clock = test_scenario::take_shared<sui::clock::Clock>(&scenario);
            let payment_coin = test_scenario::take_from_sender<sui::coin::Coin<sui::sui::SUI>>(&scenario);
            
            capsule::unlock_capsule(
                &mut capsule,
                option::some(payment_coin),
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            assert!(capsule::is_unlocked(&capsule), 0);
            
            test_scenario::return_shared(clock);
            sui::transfer::public_transfer(capsule, USER2);
        };
        
        test_scenario::end(scenario);
    }
}