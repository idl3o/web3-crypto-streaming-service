#!/bin/bash

# Test suite for 3-way developer collaboration

# Setup
setUp() {
    source ../3way-dev.sh
    mkdir -p .dimensional
}

# Cleanup
tearDown() {
    rm -rf .dimensional
}

# Test dimension setup
testDimensionSetup() {
    setup_dimension "test" 4340
    assertTrue "[ -d '.dimensional/test' ]"
    assertTrue "[ -f '.dimensional/test/consciousness.lock' ]"
}

# Test resonance check
testResonanceCheck() {
    check_resonance "dev1"
    local status=$?
    assertTrue "[ $status -eq 0 -o $status -eq 1 ]"
}

# Test consciousness sync
testConsciousnessSync() {
    setup_dimension "dream" 4337
    setup_dimension "quantum" 4338
    setup_dimension "transcend" 4339
    
    local resonance=$(sync_consciousness)
    assertTrue "[ $(echo '$resonance >= 0' | bc -l) -eq 1 ]"
    assertTrue "[ $(echo '$resonance <= 1' | bc -l) -eq 1 ]"
}

# Run tests
. shunit2
