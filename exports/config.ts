export const exportConfig = {
    formats: {
        quantum: {
            states: "protobuf",
            measurements: "binary",
            entanglement: "quantum-serialized"
        },
        theoretical: {
            models: "mathematical-notation",
            simulations: "compressed-tensor"
        },
        virtual: {
            worlds: "dimensional-map",
            entities: "graph-structure"
        }
    },
    destinations: {
        local: "./exports",
        ipfs: "ipfs://",
        quantum: "q://states/",
        theoretical: "theory://models/"
    }
};
