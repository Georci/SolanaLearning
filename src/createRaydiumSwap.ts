import {
    MarketV2,
    MAINNET_PROGRAM_ID,
    DEVNET_PROGRAM_ID,
    TxVersion,
    InnerSimpleV0Transaction,
    Liquidity,
    createPoolInstruction
} from '@raydium-io/raydium-sdk'

import { Connection, sendAndConfirmTransaction, Keypair, PublicKey, Transaction } from '@solana/web3.js'

const { load_local_wallet } = require("./createToken")



async function create_amm_pool(input: CreateAMMPoolInput) {

    const connection = new Connection("https://devnet.helius-rpc.com/?api-key=c833cd62-5224-46f0-8895-969d3f66f44c", "confirmed");
    const RAYDIUM_PROGRAM_ID = DEVNET_PROGRAM_ID

    let makeTxVersion = TxVersion.V0;

    // -------- step 1: make create market instructions --------
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

    // // 4. 设置流动性池的参数
    // const poolParams = {
    //     // OpenBook 市场ID（前面创建市场时获得）
    //     marketId: marketId,
    //     // 基础代币铸币地址（例如：RAY 的 Mint 地址）
    //     baseMint: input.baseToken,
    //     // 报价代币铸币地址（例如：USDC 的 Mint 地址）
    //     quoteMint: input.quoteToken,
    //     // 初始流动性：基础代币数量（注意需要根据代币小数位转换）
    //     initialBaseLiquidity: 1_000_000,  // 示例：1,000,000 单位
    //     // 初始流动性：报价代币数量
    //     initialQuoteLiquidity: 2_000_000, // 示例：2,000,000 单位
    //     // 池启动时间，使用 Unix 时间戳（例如设置为当前时间后 60 秒启动）
    //     startTime: Math.floor(Date.now() / 1000) + 60,
    //     // 价格 Tick 大小（请根据市场起始价格和建议比例设置，此处示例为 0.001）
    //     tickSize: 0.001,
    //     // 最小订单大小（示例值，根据 OpenBook 的要求调整）
    //     minOrderSize: 0.000001,
    //     // 此外还可能需要其他参数，如手续费配置等，可根据实际需要补充
    // };

    // try {
    //     // 5. 使用 raydium-sdk 构建创建池的指令
    //     // 这里假设 createPoolInstruction 接受 pool 参数以及创建该池的发起人地址
    //     const poolIx = await createPoolInstruction(poolParams, wallet.publicKey);

    //     // 6. 创建一个新的交易，并添加创建池指令
    //     const transaction = new Transaction().add(poolIx);

    //     // 7. 签名并发送交易到 Solana 网络
    //     const txSignature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    //     console.log("流动性池创建成功，交易签名：", txSignature);
    // } catch (error) {
    //     console.error("流动性池创建失败：", error);
    // }
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
interface CreateAMMPoolInput {
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

    const marketId = await create_amm_pool(input);
}

main(
    new PublicKey("AYxoo4m42K3d7cMG4ERiBqDmyBMG8UfHq1chBjAvZ5Ba"),
    new PublicKey("Ez7JneJvwSz1yZfH5aTgZvUsaZMGoetmpoFrzq8BsH9M")
).catch(err => {
    console.error("❌ - 发生错误:", err);
});

module.exports = {
    create_amm_pool
};
