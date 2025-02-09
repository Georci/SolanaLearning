import {
    Connection,
    Keypair,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction
} from "@solana/web3.js";
import {
    getKeypairFromEnvironment,
    getExplorerLink,
} from "@solana-developers/helpers";
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";

const fs = require("fs")

function load_local_wallet(filename: string) {
    const secretKey = JSON.parse(fs.readFileSync(filename).toString());
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

async function main() {
    // const proxyUrl = "http://172.17.112.1:7890"; // 你的代理地址
    const connection = new Connection("https://devnet.helius-rpc.com/?api-key=c833cd62-5224-46f0-8895-969d3f66f44c", "confirmed");
    // const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    console.log("✅ - 连接到 Solana devnet");

    // 2. 生成密钥对（payer/mintAuthority/owner 可以是同一个账户）
    // const payer = Keypair.generate();

    const payer = load_local_wallet("/home/kenijima/.config/solana/id.json");
    const mintAuthority = payer;
    const owner = payer;
    const freezeAuthority = payer;

    console.log("✅ - 生成密钥对");
    console.log("     Payer 公钥:", payer.publicKey.toBase58());

    const payer_balance = await connection.getBalance(payer.publicKey);
    console.log("💰 - Payer 账户余额:", payer_balance / LAMPORTS_PER_SOL, "SOL");

    // 3. 给 payer 空投 SOL（仅限 devnet/testnet）
    console.log("🪂 - 申请空投...");
    // const airdropSignature = await connection.requestAirdrop(
    //     payer.publicKey,
    //     2 * LAMPORTS_PER_SOL // 1 SOL
    // );
    console.log("✅ - 空投成功");

    console.log("⏳ - 等待空投到账...");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待 5 秒

    // const payer_balance = await connection.getBalance(payer.publicKey);
    // console.log("💰 - Payer 账户余额:", payer_balance / LAMPORTS_PER_SOL, "SOL");

    // 4. 创建代币铸币账户（Token Mint）
    console.log("🛠️ - 创建代币铸币账户...");
    const mint = await createMint(
        connection,
        payer, // 支付交易费用的账户
        mintAuthority.publicKey, // 铸币权限的公钥（mintAuthority）
        freezeAuthority.publicKey, // 冻结权限（设为 null 表示不需要）
        9 // 代币的小数精度（例如 9 表示 1 token = 1_000_000_000 个最小单位）
    );
    console.log("✅ - 代币铸币账户地址:", mint.toBase58());

    // 5. 创建关联代币账户（ATA）
    console.log("🛠️ - 创建关联代币账户 (ATA) ...");
    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        payer, // 支付交易费用的账户
        mint, // 代币铸币地址
        owner.publicKey // 代币接收者（owner）的公钥
    );
    console.log("✅ - ATA 地址:", ata.address.toBase58());

    // 6. 铸造代币到 ATA
    console.log("🪙 - 铸造代币...");
    const mintAmount = 100 * 10 ** 9; // 铸造 100 个代币（考虑 9 位小数）
    const mintTxSignature = await mintTo(
        connection,
        payer, // 支付交易费用的账户
        mint, // 代币铸币地址
        ata.address, // 目标 ATA 地址
        payer, // 铸币权限的密钥对（必须拥有铸币权限）
        mintAmount // 铸造数量
    );
    console.log("✅ - 代币铸造成功，交易哈希:", mintTxSignature);

    // 7. 查询代币余额
    const balance = await connection.getTokenAccountBalance(ata.address);
    console.log("💰 - 代币余额:", balance.value.uiAmount, "tokens");
}

// main().catch((err) => {
//     console.error("❌ - 发生错误:", err);
// });

// 为代币添加元数据：
addMetaData(new PublicKey("Ez7JneJvwSz1yZfH5aTgZvUsaZMGoetmpoFrzq8BsH9M")).catch((err) => {
    console.error("❌ - 发生错误:", err);
});

async function addMetaData(mint: PublicKey) {
    const payer = load_local_wallet("/home/kenijima/.config/solana/id.json");
    const connection = new Connection("https://devnet.helius-rpc.com/?api-key=c833cd62-5224-46f0-8895-969d3f66f44c", "confirmed");

    console.log(
        `🔑 We've loaded our keypair securely, using an env file! Our public key is: ${payer.publicKey.toBase58()}`,
    );

    const transaction = new Transaction();

    const createMetadataAccountInstruction = await constructMetadataInstruction(mint);

    transaction.add(createMetadataAccountInstruction);
    const transactionSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer],
    );

    const transactionLink = getExplorerLink(
        "transaction",
        transactionSignature,
        "devnet",
    );

    console.log(`✅ Transaction confirmed, explorer link is: ${transactionLink}`);

    const tokenMintLink = getExplorerLink(
        "address",
        mint.toString(),
        "devnet",
    );

    console.log(`✅ Look at the token mint again: ${tokenMintLink}`);

}

async function constructMetadataInstruction(mint: PublicKey) {
    const payer = load_local_wallet("/home/kenijima/.config/solana/id.json");
    console.log(
        `🔑 We've loaded our keypair securely, using an env file! Our public key is: ${payer.publicKey.toBase58()}`,
    );
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    );

    const metadataData = {
        name: "Naruto Token",
        symbol: "NAT",
        // Arweave / IPFS / Pinata etc link using metaplex standard for offchain data
        uri: "https://upload.wikimedia.org/wikipedia/zh/6/61/Naruto_20160925.jpg",
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    const metadataPDAAndBump = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID,
    );

    const metadataPDA = metadataPDAAndBump[0];

    const createMetadataAccountInstruction =
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint,
                mintAuthority: payer.publicKey,
                payer: payer.publicKey,
                updateAuthority: payer.publicKey,
            },
            {
                createMetadataAccountArgsV3: {
                    collectionDetails: null,
                    data: metadataData,
                    isMutable: true,
                },
            },
        );

    return createMetadataAccountInstruction;
}

module.exports = {
    load_local_wallet
};