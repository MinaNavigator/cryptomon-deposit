/**
 * Configure smartcontract to be usable once deployed
 */
import fs from 'fs/promises';
import { Mina, NetworkId, PrivateKey } from 'o1js';
import { GameContract, GameDeposit } from './index.js';

// check command line arg
/*let deployAlias = process.argv[2];
if (!deployAlias)
    throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);*/
Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';

// parse config and private key from file
type Config = {
    deployAliases: Record<
        string,
        {
            networkId?: string;
            url: string;
            keyPath: string;
            fee: string;
            feepayerKeyPath: string;
            feepayerAlias: string;
        }
    >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases["game"];
let config2 = configJson.deployAliases["deposit"];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile(config.keyPath, 'utf8')
);

let zkDeposiAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile(config2.keyPath, 'utf8')
);


let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppGameContractPrivateKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);
let zkAppGameDepositPrivateKey = PrivateKey.fromBase58(zkDeposiAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network({
    // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
    // This is to ensure the backward compatibility.
    networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
    mina: config.url,
});
// const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppGameContractAddress = zkAppGameContractPrivateKey.toPublicKey();
let zkAppGameContract = new GameContract(zkAppGameContractAddress);
let zkAppGameDepostiAddress = zkAppGameDepositPrivateKey.toPublicKey();
let zkAppGameDeposit = new GameDeposit(zkAppGameDepostiAddress);

// compile the contract to create prover keys
console.log('compile the contract...');
await GameContract.compile();
await GameDeposit.compile();

try {
    // define owner and send transaction
    console.log('build transaction and create proof...');
    let tx = await Mina.transaction(
        { sender: feepayerAddress, fee },
        async () => {
            zkAppGameDeposit.setContractAddress(zkAppGameContractAddress);
            zkAppGameDeposit.requireSignature();
        }
    );
    await tx.prove();

    console.log('send transaction...');
    const sentTx = await tx.sign([feepayerKey, zkAppGameContractPrivateKey, zkAppGameDepositPrivateKey]).send();
    if (sentTx.status === 'pending') {
        console.log(
            '\nSuccess! Update transaction sent.\n' +
            '\nYour smart contract owner will be updated' +
            '\nas soon as the transaction is included in a block:' +
            `\n${getTxnUrl(config.url, sentTx.hash)}`
        );
    }
} catch (err) {
    console.log(err);
}

function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
    const txnBroadcastServiceName = new URL(graphQlUrl).hostname
        .split('.')
        .filter((item) => item === 'minascan' || item === 'minaexplorer')?.[0];
    const networkName = new URL(graphQlUrl).hostname
        .split('.')
        .filter(
            (item) => item === 'berkeley' || item === 'testworld' || item === 'devnet'
        )?.[0];
    if (txnBroadcastServiceName && networkName) {
        return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
    }
    return `Transaction hash: ${txnHash}`;
}
