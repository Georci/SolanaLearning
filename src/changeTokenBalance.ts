import {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl

} from '@solana/web3.js';
import {
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { owner } from "./config";

// 例如，这里使用 devnet；如果你在 devnet 上测试，可以使用如下 RPC
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=c833cd62-5224-46f0-8895-969d3f66f44c', 'confirmed');

// 代币 mint 地址（假设你已经有了一个 SPL 代币 mint 地址）
const tokenMint = new PublicKey('AYxoo4m42K3d7cMG4ERiBqDmyBMG8UfHq1chBjAvZ5Ba');

(async () => {
    try {
        // 获取或创建当前钱包对应的 ATA（关联代币账户）
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            owner,
            tokenMint,
            owner.publicKey,
            undefined,
            'confirmed'
        );
        console.log("ATA 地址:", ata.address.toBase58());

        let balance_before = await connection.getTokenAccountBalance(ata.address);
        console.log("balance_before is :", balance_before);

        // 设置你想要铸造的数量
        // 注意：数量以代币的最小单位计（例如对于 6 位小数的代币，1 个完整代币 = 1_000_000）
        const amountToMint = BigInt(1_000_000_000_000); // 例如，铸造 1 个代币

        // 调用 mintTo 指令，将代币 mint 到 ATA 中
        const txSignature = await mintTo(
            connection,
            owner,         // payer & mint authority
            tokenMint,      // 代币 mint
            ata.address,    // 接收代币的 ATA 地址
            owner,         // mint authority 签名者
            amountToMint,   // 铸造数量
            [],             // 额外签名者（如果有）
        );
        console.log("铸造成功，交易签名:", txSignature);

        let balance_after = await connection.getTokenAccountBalance(ata.address);
        console.log("balance_after is :", balance_after);

    } catch (error) {
        console.error("铸造代币失败:", error);
    }
})();
