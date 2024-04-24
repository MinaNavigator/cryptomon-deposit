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
const contractAccount = "B62qkDkxHaeFWybkEJjjUNY46J1mthaFcPtvRndgWtAiZdPxMMb7JJ2";
const contract = new GameManager(PublicKey.fromBase58(contractAccount));

const owner = contract.Owner.get();

console.log("owner", owner?.toBase58());