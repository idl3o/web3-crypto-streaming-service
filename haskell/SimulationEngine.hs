module SimulationEngine where

import Data.Time.Clock.POSIX (getPOSIXTime)
import System.Random
import Data.Aeson (Object, ToJSON, FromJSON, encode, object, (.=))
import qualified Data.ByteString.Lazy.Char8 as BS
import System.Environment (getArgs)
import Data.Maybe (fromMaybe)

-- Simulation State
data SimState = SimState
    { transactionCount :: Int
    , essenceGenerated :: Double
    , streamingTime :: Int
    , feesSaved :: Double
    , volatility :: Double
    } deriving (Show)

-- Make SimState an instance of ToJSON
instance ToJSON SimState where
    toJSON (SimState tc eg st fs v) = object
        [ "transactionCount" .= tc
        , "essenceGenerated" .= eg
        , "streamingTime" .= st
        , "feesSaved" .= fs
        , "volatility" .= v
        ]

-- Initialize simulation state
initSimState :: Double -> SimState
initSimState vol = SimState 0 0.0 0 0.0 vol

-- Generate a simulated transaction
generateTransaction :: SimState -> IO (SimState, Object)
generateTransaction state = do
    rnd <- randomRIO (0, 3) :: IO Int
    timestamp <- round <$> getPOSIXTime
    let txType = ["STREAM_PAYMENT", "ESSENCE_EARNED", "TOKEN_MINTED", "FEE_DISCOUNT"] !! rnd
        
    -- Transaction details depend on type
    (transaction, essence, fees) <- case txType of
        "STREAM_PAYMENT" -> do
            amount <- randomRIO (0.001, 0.05) :: IO Double
            let tx = createStreamPayment timestamp amount
            return (tx, 0.0, 0.0)
        "ESSENCE_EARNED" -> do
            amount <- randomRIO (1.0, 10.0) :: IO Double
            let tx = createEssenceEarned timestamp amount
            return (tx, amount, 0.0)
        "TOKEN_MINTED" -> do
            tokenId <- randomRIO (1000, 9999) :: IO Int
            let tx = createTokenMinted timestamp tokenId
            return (tx, 0.0, 0.0)
        "FEE_DISCOUNT" -> do
            originalAmount <- randomRIO (0.01, 0.1) :: IO Double
            discountRate <- randomRIO (0.05, 0.2) :: IO Double
            let finalAmount = originalAmount * (1 - discountRate)
                feeSaved = originalAmount - finalAmount
                tx = createFeeDiscount timestamp originalAmount finalAmount discountRate
            return (tx, 0.0, feeSaved)
        _ -> error "Unknown transaction type"
    
    -- Update state
    let newState = updateState state txType essence fees
    return (newState, transaction)

-- Create different transaction types (simplified example)
createStreamPayment :: Integer -> Double -> Object
createStreamPayment timestamp amount = object
    [ "type" .= ("STREAM_PAYMENT" :: String)
    , "timestamp" .= timestamp
    , "amount" .= amount
    ]

createEssenceEarned :: Integer -> Double -> Object
createEssenceEarned timestamp amount = object
    [ "type" .= ("ESSENCE_EARNED" :: String)
    , "timestamp" .= timestamp
    , "faeEssence" .= amount
    ]

createTokenMinted :: Integer -> Int -> Object
createTokenMinted timestamp tokenId = object
    [ "type" .= ("TOKEN_MINTED" :: String)
    , "timestamp" .= timestamp
    , "tokenId" .= tokenId
    ]

createFeeDiscount :: Integer -> Double -> Double -> Double -> Object
createFeeDiscount timestamp original final discount = object
    [ "type" .= ("FEE_DISCOUNT" :: String)
    , "timestamp" .= timestamp
    , "originalAmount" .= original
    , "amount" .= final
    , "discountApplied" .= discount
    ]

-- Update simulation state based on transaction
updateState :: SimState -> String -> Double -> Double -> SimState
updateState state txType essence fees = 
    case txType of
        "STREAM_PAYMENT" -> state { transactionCount = transactionCount state + 1 }
        "ESSENCE_EARNED" -> state { 
            transactionCount = transactionCount state + 1,
            essenceGenerated = essenceGenerated state + essence
        }
        "TOKEN_MINTED" -> state { transactionCount = transactionCount state + 1 }
        "FEE_DISCOUNT" -> state { 
            transactionCount = transactionCount state + 1,
            feesSaved = feesSaved state + fees
        }
        _ -> state

-- Main simulation function
runSimulation :: SimState -> Int -> IO (SimState, [Object])
runSimulation state 0 = return (state, [])
runSimulation state n = do
    (newState, tx) <- generateTransaction state
    (finalState, txs) <- runSimulation newState (n - 1)
    return (finalState, tx : txs)

-- Parse command line arguments
parseArgs :: [String] -> Double
parseArgs args = 
    let vol = safeRead (fromMaybe "0.2" (lookup "--volatility" (parseOptions args)))
    in initSimState vol

-- Helper function to safely read a Double from a String
safeRead :: String -> Double
safeRead str = case reads str :: [(Double, String)] of
    [(x, "")] -> x
    _         -> 0.2 -- Default value

-- Parse options from command line arguments
parseOptions :: [String] -> [(String, String)]
parseOptions [] = []
parseOptions (flag:value:rest) | take 2 flag == "--" = (flag, value) : parseOptions rest
parseOptions (_:rest) = parseOptions rest

-- Main entry point
main :: IO ()
main = do
    args <- getArgs
    let initialState = parseArgs args
    let numTransactions = 5 -- Fixed number of transactions for now
    (finalState, transactions) <- runSimulation initialState numTransactions
    BS.putStrLn $ encode transactions
