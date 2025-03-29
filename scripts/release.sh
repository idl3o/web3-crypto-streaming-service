#!/bin/bash

# Ensure we're on main branch
git checkout main

# Get release type from argument
RELEASE_TYPE=${1:-patch}

# Run tests
npm test

# If tests pass, bump version and create release
if [ $? -eq 0 ]; then
    npm version $RELEASE_TYPE
    git push --follow-tags
    npm publish
else
    echo "Tests failed, release aborted"
    exit 1
fi
