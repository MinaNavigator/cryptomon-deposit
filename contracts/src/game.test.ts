import { GameDeposit, DepositData } from './gamedeposit.js';
import { GameContract, WithdrawData } from './gamecontract.js';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, UInt64, Account, assert } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Game', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppGameContractAddress: PublicKey,
    zkAppGameContractPrivateKey: PrivateKey,
    zkAppGameContract: GameContract,
    zkAppGameDepostiAddress: PublicKey,
    zkAppGameDepositPrivateKey: PrivateKey,
    zkAppGameDeposit: GameDeposit;

  beforeAll(async () => {
    if (proofsEnabled) {
      await GameContract.compile();
      await GameDeposit.compile();
    }
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppGameContractPrivateKey = PrivateKey.random();
    zkAppGameContractAddress = zkAppGameContractPrivateKey.toPublicKey();
    zkAppGameContract = new GameContract(zkAppGameContractAddress);
    zkAppGameDepositPrivateKey = PrivateKey.random();
    zkAppGameDepostiAddress = zkAppGameDepositPrivateKey.toPublicKey();
    zkAppGameDeposit = new GameDeposit(zkAppGameDepostiAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount, 2);
      await zkAppGameContract.deploy();
      await zkAppGameDeposit.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppGameContractPrivateKey, zkAppGameDepositPrivateKey]).send();
  }

  it('generates and deploys the smarts contract', async () => {
    await localDeploy();
    const num = zkAppGameContract.CurrentId.get();
    const zero = new UInt64(0);
    expect(num).toEqual(zero);
    const num2 = zkAppGameDeposit.CurrentId.get();
    expect(num2).toEqual(zero);
  });

  it('define owner game contract', async () => {
    await localDeploy();

    const oldOwner = zkAppGameContract.Owner.get();
    expect(oldOwner).toEqual(PublicKey.empty());
    const txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameContract.setOwner(deployerAccount);
      zkAppGameContract.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameContractPrivateKey]).send();

    const newOwner = zkAppGameContract.Owner.getAndRequireEquals();
    expect(newOwner).toEqual(deployerAccount);
  });

  it('define owner game deposit', async () => {
    await localDeploy();

    const oldOwner = zkAppGameDeposit.Owner.get();
    expect(oldOwner).toEqual(PublicKey.empty());
    const txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setOwner(deployerAccount);
      zkAppGameDeposit.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameDepositPrivateKey]).send();

    const newOwner = zkAppGameDeposit.Owner.getAndRequireEquals();
    expect(newOwner).toEqual(deployerAccount);
  });

  it('define game contract for game deposit', async () => {
    await localDeploy();

    const gameContract = zkAppGameDeposit.GameContract.get();
    expect(gameContract).toEqual(PublicKey.empty());

    let txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setOwner(deployerAccount);
      zkAppGameDeposit.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameDepositPrivateKey]).send();

    const txn2 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setContractAddress(zkAppGameContractAddress);
      zkAppGameDeposit.requireSignature();
    });
    await txn2.prove();
    await txn2.sign([deployerKey, zkAppGameDepositPrivateKey]).send();

    const newGameContract = zkAppGameDeposit.GameContract.getAndRequireEquals();
    expect(newGameContract).toEqual(zkAppGameContractAddress);
  });

  it('make a deposit', async () => {
    await localDeploy();

    let txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setOwner(deployerAccount);
      zkAppGameDeposit.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameDepositPrivateKey]).send();

    const txn2 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.setContractAddress(zkAppGameContractAddress);
      zkAppGameDeposit.requireSignature();
    });
    await txn2.prove();
    await txn2.sign([deployerKey, zkAppGameDepositPrivateKey]).send();

    const mina = new UInt64(10 ** 9);
    const txn3 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameDeposit.deposit(mina);
      zkAppGameDeposit.requireSignature();
    });
    await txn3.prove();
    await txn3.sign([deployerKey, zkAppGameDepositPrivateKey]).send();

    const bal = zkAppGameContract.account.balance.get();
    expect(bal).toEqual(mina);
  });
});
