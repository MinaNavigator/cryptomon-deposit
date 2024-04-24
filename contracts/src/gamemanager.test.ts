import { GameManager } from './gamemanager';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, UInt64, Account, assert } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('GameManager', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppGameContractAddress: PublicKey,
    zkAppGameContractPrivateKey: PrivateKey,
    zkAppGameContract: GameManager;

  beforeAll(async () => {
    if (proofsEnabled) {
      await GameManager.compile();
    }
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    let accountOne = Local.testAccounts[0];
    deployerKey = accountOne.key;
    deployerAccount = accountOne;
    let accountTwo = Local.testAccounts[1];
    senderKey = accountTwo.key;
    senderAccount = accountTwo;
    zkAppGameContractPrivateKey = PrivateKey.random();
    zkAppGameContractAddress = zkAppGameContractPrivateKey.toPublicKey();
    zkAppGameContract = new GameManager(zkAppGameContractAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkAppGameContract.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppGameContractPrivateKey]).send();
  }

  it('generates and deploys the smarts contract', async () => {
    await localDeploy();
    const num = zkAppGameContract.DepositId.get();
    const zero = new UInt64(0);
    expect(num).toEqual(zero);
    const num2 = zkAppGameContract.WithdrawId.get();
    expect(num2).toEqual(zero);
  });

  it('define owner game contract', async () => {
    await localDeploy();

    const oldOwner = zkAppGameContract.Owner.get();
    expect(oldOwner).toEqual(PublicKey.empty());
    await setGameContractOwner();

    const newOwner = zkAppGameContract.Owner.getAndRequireEquals();
    expect(newOwner).toEqual(deployerAccount);
  });


  it('make a deposit', async () => {
    await localDeploy();

    await setGameContractOwner();

    const mina = new UInt64(10 ** 9);
    await deposit(mina);

    const bal = zkAppGameContract.account.balance.get();
    expect(bal).toEqual(mina);
  });

  it('make a withdraw', async () => {
    await localDeploy();

    await setGameContractOwner();

    const mina = new UInt64(10 ** 9);
    await deposit(mina);


    const balanceBefore = Mina.getBalance(senderAccount);
    const txn4 = await Mina.transaction(deployerAccount, async () => {
      zkAppGameContract.withdraw(mina, senderAccount, new UInt64(1));
      zkAppGameContract.requireSignature();
    });
    await txn4.prove();
    await txn4.sign([deployerKey, senderKey, zkAppGameContractPrivateKey]).send();
    const balanceAfter = Mina.getBalance(senderAccount);

    // check if sender account receive 1 mina after withdraw
    const bal = balanceAfter.sub(balanceBefore);
    expect(bal).toEqual(mina);
  });

  it('make two deposit', async () => {
    await localDeploy();

    await setGameContractOwner();

    const mina = new UInt64(10 ** 9);
    await deposit(mina);
    await deposit(mina.mul(5));

    const bal = Mina.getBalance(zkAppGameContractAddress);
    expect(bal).toEqual(mina.mul(6));
    // check if the id correctly increment
    const currentId = zkAppGameContract.DepositId.get()
    expect(currentId).toEqual(new UInt64(2));
  });

  async function setGameContractOwner() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      zkAppGameContract.setOwner(deployerAccount);
      zkAppGameContract.requireSignature();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppGameContractPrivateKey]).send();
  }

  async function deposit(amount: UInt64) {
    const txn3 = await Mina.transaction(deployerAccount, async () => {
      await zkAppGameContract.deposit(amount);
      await zkAppGameContract.requireSignature();
    });
    await txn3.prove();
    await txn3.sign([deployerKey, zkAppGameContractPrivateKey]).send();
  }
});
