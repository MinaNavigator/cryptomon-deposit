import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, fetchAccount } from 'o1js';
import { GameManager } from './gamemanager.js';

let txn, txn2, txn3, txn4;
// setup local ledger
const Devnet = Mina.Network(
    'https://proxy.devnet.minaexplorer.com/graphql'
);
console.log('Devnet Instance Created');
Mina.setActiveInstance(Devnet);

// contract account
const contractAccount = "B62qrRrikoeHWeyhacPKxtWfVcpeaG6AgZp4qdFjo2D7qDVbwWZ1YQZ";
const contract = new GameManager(PublicKey.fromBase58(contractAccount));
const publicKey = PublicKey.fromBase58(contractAccount);
await fetchAccount({ publicKey });

const owner = await contract.Owner.get();

console.log("owner", owner?.toBase58());