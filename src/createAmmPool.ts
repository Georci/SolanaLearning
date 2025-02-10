import { RAYMint, USDCMint, OPEN_BOOK_PROGRAM, DEVNET_PROGRAM_ID, WSOLMint } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from './config'
import {
    MARKET_STATE_LAYOUT_V3,
    AMM_V4,
    FEE_DESTINATION_ID,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import BN from 'bn.js'
import { error } from 'console'

const token1 = new PublicKey("AYxoo4m42K3d7cMG4ERiBqDmyBMG8UfHq1chBjAvZ5Ba");
const token2 = new PublicKey("Ez7JneJvwSz1yZfH5aTgZvUsaZMGoetmpoFrzq8BsH9M");

export const createMarket = async () => {
    const raydium = await initSdk()

    // check mint info here: https://api-v3.raydium.io/mint/list
    // or get mint info by api: await raydium.token.getTokenInfo('mint address')

    const { execute, extInfo, transactions } = await raydium.marketV2.create({
        baseInfo: {
            // create market doesn't support token 2022
            mint: token1,
            decimals: 6,
        },
        quoteInfo: {
            // create market doesn't support token 2022
            mint: token2,
            decimals: 9,
        },
        lotSize: 1,
        tickSize: 0.01,
        // dexProgramId: OPEN_BOOK_PROGRAM,
        dexProgramId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET, // devnet

        // requestQueueSpace: 5120 + 12, // optional
        // eventQueueSpace: 262144 + 12, // optional
        // orderbookQueueSpace: 65536 + 12, // optional

        txVersion,
        // optional: set up priority fee here
        // computeBudgetConfig: {
        //   units: 600000,
        //   microLamports: 46591500,
        // },
    })

    console.log(
        `create market total ${transactions.length} txs, market info: `,
        Object.keys(extInfo.address).reduce(
            (acc, cur) => ({
                ...acc,
                [cur]: extInfo.address[cur as keyof typeof extInfo.address].toBase58(),
            }),
            {}
        )
    )

    // const txIds = await execute({
    //     // set sequentially to true means tx will be sent when previous one confirmed
    //     sequentially: true,
    // })

    try {
        const txIds = await execute({ sequentially: true });
        console.log('create market txIds:', txIds);
    } catch (error) {
        console.error('Error during execute:', error);
    }

    console.log(
        'note: create market does not support token 2022, if you need more detail error info, set txVersion to TxVersion.LEGACY'
    )
    // console.log('create market txIds:', txIds)
    process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createMarket()




export const createAmmPool = async () => {
    const raydium = await initSdk()
    const marketId = new PublicKey(`EjQbq5PLXqnwawveBvN8FSh5oEAeTaJR7UzUVJoSEQcB`)

    // if you are confirmed your market info, don't have to get market info from rpc below
    const marketBufferInfo = await raydium.connection.getAccountInfo(new PublicKey(marketId))
    const { baseMint, quoteMint } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo!.data)

    // check mint info here: https://api-v3.raydium.io/mint/list
    // or get mint info by api: await raydium.token.getTokenInfo('mint address')

    // amm pool doesn't support token 2022
    const baseMintInfo = await raydium.token.getTokenInfo(baseMint)
    const quoteMintInfo = await raydium.token.getTokenInfo(quoteMint)
    const baseAmount = new BN(100_000_000_000)
    const quoteAmount = new BN(100_000_000_000)

    if (
        baseMintInfo.programId !== TOKEN_PROGRAM_ID.toBase58() ||
        quoteMintInfo.programId !== TOKEN_PROGRAM_ID.toBase58()
    ) {
        throw new Error(
            'amm pools with openbook market only support TOKEN_PROGRAM_ID mints, if you want to create pool with token-2022, please create cpmm pool instead'
        )
    }

    if (baseAmount.mul(quoteAmount).lte(new BN(1).mul(new BN(10 ** baseMintInfo.decimals)).pow(new BN(2)))) {
        throw new Error('initial liquidity too low, try adding more baseAmount/quoteAmount')
    }
    console.log("wuxizhi1");
    const { execute, extInfo } = await raydium.liquidity.createPoolV4({
        // programId: AMM_V4,
        programId: DEVNET_PROGRAM_ID.AmmV4, // devnet
        marketInfo: {
            marketId,
            // programId: OPEN_BOOK_PROGRAM,
            programId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET, // devent
        },
        baseMintInfo: {
            mint: baseMint,
            decimals: baseMintInfo.decimals, // if you know mint decimals here, can pass number directly
        },
        quoteMintInfo: {
            mint: quoteMint,
            decimals: quoteMintInfo.decimals, // if you know mint decimals here, can pass number directly
        },
        baseAmount: baseAmount,
        quoteAmount: quoteAmount,

        // sol devnet faucet: https://faucet.solana.com/
        // baseAmount: new BN(4 * 10 ** 9), // if devent pool with sol/wsol, better use amount >= 4*10**9
        // quoteAmount: new BN(4 * 10 ** 9), // if devent pool with sol/wsol, better use amount >= 4*10**9

        startTime: new BN(0), // unit in seconds
        ownerInfo: {
            useSOLBalance: true,
        },
        associatedOnly: false,
        txVersion,
        // feeDestinationId: FEE_DESTINATION_ID,
        feeDestinationId: DEVNET_PROGRAM_ID.FEE_DESTINATION_ID, // devnet
        // optional: set up priority fee here
        // computeBudgetConfig: {
        //   units: 600000,
        //   microLamports: 4659150,
        // },
    })
    console.log("wuxizhi2");

    // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
    const { txId } = await execute({ sendAndConfirm: false })
    console.log("wuxizhi3");

    console.log(
        'amm pool created! txId: ',
        txId,
        ', poolKeys:',
        Object.keys(extInfo.address).reduce(
            (acc, cur) => ({
                ...acc,
                [cur]: extInfo.address[cur as keyof typeof extInfo.address].toBase58(),
            }),
            {}
        )
    )
    process.exit() // if you don't want to end up node execution, comment this line
}

// 查询某个pool的信息(Devnet)
export const find_pool_info = async () => {
    const raydium = await initSdk()
    const amm_pool_Id = new PublicKey('HUpss2qse4HeEgGSFY3EWutoTiDx926oWY5TC1RieJZC')

    const poolInfo = await raydium.liquidity.getRpcPoolInfo(amm_pool_Id.toBase58());
    const formattedInfo = formatPoolInfo(poolInfo);
    console.log("Pool Information:\n", JSON.stringify(formattedInfo, null, 2));
}



find_pool_info().then(() => { process.exit(0) })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    });


function formatPoolInfo(poolInfo: any): Record<string, any> {
    return {
        status: poolInfo.status.toString(),
        nonce: poolInfo.nonce.toString(),
        depth: poolInfo.depth.toString(),
        baseDecimal: poolInfo.baseDecimal.toString(),
        quoteDecimal: poolInfo.quoteDecimal.toString(),
        minSize: poolInfo.minSize.toString(),
        baseLotSize: poolInfo.baseLotSize.toString(),
        quoteLotSize: poolInfo.quoteLotSize.toString(),
        // 交易费用显示为分子/分母的形式
        tradeFee: `${poolInfo.tradeFeeNumerator.toString()}/${poolInfo.tradeFeeDenominator.toString()}`,
        swapFee: `${poolInfo.swapFeeNumerator.toString()}/${poolInfo.swapFeeDenominator.toString()}`,
        // 关键地址转换为 Base58 字符串
        baseVault: poolInfo.baseVault instanceof PublicKey ? poolInfo.baseVault.toBase58() : poolInfo.baseVault,
        quoteVault: poolInfo.quoteVault instanceof PublicKey ? poolInfo.quoteVault.toBase58() : poolInfo.quoteVault,
        baseMint: poolInfo.baseMint instanceof PublicKey ? poolInfo.baseMint.toBase58() : poolInfo.baseMint,
        quoteMint: poolInfo.quoteMint instanceof PublicKey ? poolInfo.quoteMint.toBase58() : poolInfo.quoteMint,
        lpMint: poolInfo.lpMint instanceof PublicKey ? poolInfo.lpMint.toBase58() : poolInfo.lpMint,
        openOrders: poolInfo.openOrders instanceof PublicKey ? poolInfo.openOrders.toBase58() : poolInfo.openOrders,
        marketId: poolInfo.marketId instanceof PublicKey ? poolInfo.marketId.toBase58() : poolInfo.marketId,
        marketProgramId: poolInfo.marketProgramId instanceof PublicKey ? poolInfo.marketProgramId.toBase58() : poolInfo.marketProgramId,
        // 池中余额等字段
        baseReserve: poolInfo.baseReserve.toString(),
        quoteReserve: poolInfo.quoteReserve.toString(),
        poolPrice: poolInfo.poolPrice, // 如果已经是数字类型，则直接输出
    };
}