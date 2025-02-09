import {
    MarketV2,
    MAINNET_PROGRAM_ID,
    DEVNET_PROGRAM_ID,
    TxVersion,
    InnerSimpleV0Transaction,
    Liquidity
} from '@raydium-io/raydium-sdk'

import { Connection, sendAndConfirmTransaction, Keypair, PublicKey, Transaction } from '@solana/web3.js'

const { load_local_wallet } = require("./createToken")



async function createMarket(input: CreateMarketInput) {

    const connection = new Connection("https://devnet.helius-rpc.com/?api-key=c833cd62-5224-46f0-8895-969d3f66f44c", "confirmed");
    const RAYDIUM_PROGRAM_ID = DEVNET_PROGRAM_ID

    let makeTxVersion = TxVersion.V0;

    // -------- step 1: make instructions --------
    const createMarketInstruments = await MarketV2.makeCreateMarketInstructionSimple({
        connection,
        wallet: input.wallet.publicKey,
        baseInfo: input.baseToken,
        quoteInfo: input.quoteToken,
        lotSize: input.lotSize, // default 1
        tickSize: input.tickSize, // default 0.01
        dexProgramId: RAYDIUM_PROGRAM_ID.OPENBOOK_MARKET,
        makeTxVersion,
    })

    let marketId = createMarketInstruments.address.marketId
    let wallet = input.wallet;

    let txids = await buildAndSendTx(createMarketInstruments.innerTransactions, { connection, wallet, skipPreflight: true })
    console.log('Market Created')
    console.log('Create Market Transactions :', txids)
    console.log('Market Address :', marketId)

    return marketId
}

async function createPool(input) {

    const connection = new Connection("https://devnet.helius-rpc.com/?api-key=c833cd62-5224-46f0-8895-969d3f66f44c", "confirmed");
    const RAYDIUM_PROGRAM_ID = DEVNET_PROGRAM_ID

    let makeTxVersion = TxVersion.V0;

    // -------- step 1: make instructions --------
    const createMarketInstruments = await Liquidity.makeCreatePoolTransaction({
        connection,
        wallet: input.wallet.publicKey,
        baseInfo: input.baseToken,
        quoteInfo: input.quoteToken,
        lotSize: input.lotSize, // default 1
        tickSize: input.tickSize, // default 0.01
        dexProgramId: RAYDIUM_PROGRAM_ID.OPENBOOK_MARKET,
        makeTxVersion,
    })

    let marketId = createMarketInstruments.address.marketId
    let wallet = input.wallet;

    let txids = await buildAndSendTx(createMarketInstruments.innerTransactions, { connection, wallet, skipPreflight: true })
    console.log('Market Created')
    console.log('Create Market Transactions :', txids)
    console.log('Market Address :', marketId)

    return marketId
}

async function buildAndSendTx(innerTransactions: InnerSimpleV0Transaction[], { connection, wallet, skipPreflight }: { connection: Connection, wallet: Keypair, skipPreflight: boolean }) {
    const txids = []

    for (const txWithMeta of innerTransactions) {
        // 转换交易对象为可签名的Transaction
        const transaction = new Transaction().add(...txWithMeta.instructions)

        // 添加交易所需的签名者（通常需要payer）
        transaction.feePayer = wallet.publicKey
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

        // 签名交易
        // const signedTx = await wallet.signTransaction(transaction)

        // 发送并确认交易
        const txid = await sendAndConfirmTransaction(
            connection,
            transaction,
            [wallet],
        )
        console.log("✅ - 池子铸造成功，交易哈希:", txid);
    }
}
interface CreateMarketInput {
    wallet: Keypair; // 假设 wallet 是 Keypair 类型
    baseToken: {
        mint: PublicKey;
        decimals: number;
    };
    quoteToken: {
        mint: PublicKey;
        decimals: number;
    };
    lotSize: number;
    tickSize: number;
}

async function main(token1: PublicKey, token2: PublicKey) {
    const wallet = load_local_wallet("/home/kenijima/.config/solana/id.json");

    const input = {
        wallet,
        baseToken: {
            mint: token1,
            decimals: 9
        },
        quoteToken: {
            mint: token2,
            decimals: 6
        },
        lotSize: 1,
        tickSize: 0.01
    };

    const marketId = await createMarket(input);
}

main(
    new PublicKey("AYxoo4m42K3d7cMG4ERiBqDmyBMG8UfHq1chBjAvZ5Ba"),
    new PublicKey("Ez7JneJvwSz1yZfH5aTgZvUsaZMGoetmpoFrzq8BsH9M")
).catch(err => {
    console.error("❌ - 发生错误:", err);
});

module.exports = {
    createMarket
};
