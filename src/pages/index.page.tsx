
import Head from 'next/head';
import Image from 'next/image';
import { memo, useEffect, useState } from 'react';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';
import { Mina, PublicKey, UInt64, fetchAccount } from 'o1js';
import heroMinaLogo from '../../public/assets/hero-mina-logo.svg';
import arrowRightSmall from '../../public/assets/arrow-right-small.svg';
import { GameManager } from '../../contracts/src/gamemanager';
import ZkappWorkerClient from './zkappWorkerClient';

export default function Home() {
  const [amount, setAmount] = useState(10);
  const [zkApp, setZkApp] = useState<GameManager | null>(null);
  const zkAppAddress = 'B62qrRrikoeHWeyhacPKxtWfVcpeaG6AgZp4qdFjo2D7qDVbwWZ1YQZ';
  let transactionFee = 0.1;
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentOwner: null as null | PublicKey,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
    network: null
  });

  const [displayText, setDisplayText] = useState('');
  const [transactionlink, setTransactionLink] = useState('');

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    async function timeout(seconds: number): Promise<void> {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, seconds * 1000);
      });
    }
    (async () => {
      if (!state.hasBeenSetup) {
        setDisplayText('Loading web worker...');
        console.log('Loading web worker...');
        const zkappWorkerClient = new ZkappWorkerClient();
        await timeout(5);

        setDisplayText('Done loading web worker');
        console.log('Done loading web worker');

        await zkappWorkerClient.setActiveInstanceToDevnet();

        const mina = (window as any).mina;

        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        const network = await mina.requestNetwork();
        console.log("network", network);

        console.log(`Using key:${publicKey.toBase58()}`);
        setDisplayText(`Using key:${publicKey.toBase58()}`);

        setDisplayText('Checking if fee payer account exists...');
        console.log('Checking if fee payer account exists...');

        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!
        });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();

        console.log('Compiling zkApp...');
        setDisplayText('Compiling zkApp...');
        await zkappWorkerClient.compileContract();
        console.log('zkApp compiled');
        setDisplayText('zkApp compiled...');

        const zkappPublicKey = PublicKey.fromBase58(zkAppAddress);

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log('Getting zkApp state...');
        setDisplayText('Getting zkApp state...');
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        state.currentOwner = await zkappWorkerClient.getOwner();
        setDisplayText('');

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentOwner: null,
          network
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (; ;) {
          setDisplayText('Checking if fee payer account exists...');
          console.log('Checking if fee payer account exists...');
          const res = await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.publicKey!
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  const deposit = async () => {
    try {

      let amountMina = amount * 10 ** 9;
      const amountSend: UInt64 = UInt64.from(amountMina);

      setState({ ...state, creatingTransaction: true });

      setDisplayText('Creating a transaction...');
      console.log('Creating a transaction...');

      await state.zkappWorkerClient!.createUpdateTransaction(amountSend.toJSON(), state.publicKey?.toJSON());

      setDisplayText('Creating proof...');
      console.log('Creating proof...');
      await state.zkappWorkerClient!.proveUpdateTransaction();

      console.log('Requesting send transaction...');
      setDisplayText('Requesting send transaction...');
      const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();

      setDisplayText('Getting transaction JSON...');
      console.log('Getting transaction JSON...');

      const { hash } = await (window as any).mina.sendTransaction({
        transaction: transactionJSON,
        feePayer: {
          fee: transactionFee,
          memo: ''
        }
      });

      const transactionLink = `https://devnet.minaexplorer.com/transaction/${hash}`;
      console.log(`View transaction at ${transactionLink}`);

      setTransactionLink(transactionLink);
      setDisplayText(transactionLink);

      setState({ ...state, creatingTransaction: false });
    } catch (err: any) {
      // You may want to show the error message in your UI to the user if the transaction fails.
      console.log(err?.message);
    }
  }

  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = 'https://www.aurowallet.com/';
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        Install Auro wallet here
      </a>
    );
    hasWallet = <div>Could not find a wallet. {auroLinkElem}</div>;
  }

  const stepDisplay = transactionlink ? (
    <a href={displayText} target="_blank" rel="noreferrer">
      View transaction
    </a>
  ) : (
    displayText
  );

  let setup = (
    <div
      className={styles.start}
      style={{ fontWeight: 'bold', fontSize: '1.5rem', paddingBottom: '5rem' }}
    >
      {stepDisplay}
      {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink =
      'https://faucet.minaprotocol.com/?address=' + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div>
        <span style={{ paddingRight: '1rem' }}>Account does not exist.</span>
        <a href={faucetLink} target="_blank" rel="noreferrer">
          Visit the faucet to fund this fee payer account
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <>
        <div className='flex-column'>
          <h2>Amount of mina to deposit to cryptomon game</h2>
          <input className='input' placeholder='amount in mina to deposit' type='number' onChange={(event) => setAmount(parseFloat(event.target.value))} value={amount}></input>
          <button className='button' onClick={deposit}>Deposit</button>
          <span>You will receive {amount * 2} $ in game</span>
        </div>
      </>
    );
  }

  const getAddress = () => {
    return state.publicKey?.toBase58().substring(0, 10) + "..." + state.publicKey?.toBase58().slice(-10);
  };

  const connected = (<div className='flex-column'>
    <div style={{ marginBottom: 0 }}><span>🟢</span> <span title={state.publicKey?.toBase58()}>{getAddress()}</span></div>
    <div>{state.network?.name.toLowerCase() != "devnet" ? "Wrong network choose Devnet" : "Devnet"}</div>
  </div >);

  const disconnected = (<div>
    <div><span>🔴</span> <span>Not connected</span></div>
    <div></div>
  </div>);

  return (
    <>
      <Head>
        <title>Cryptomon Deposit</title>
        <meta name="description" content="Deposit money on cryptomon game" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>
      <GradientBG>
        <header>
          <div className='flex-row' style={{ justifyContent: 'flex-end', padding: '10px', cursor: 'pointer' }}>
            <div>{state.publicKey ? connected : disconnected}</div>
          </div>
        </header>
        <div className={styles.main} >
          <div className={styles.center}>
            <a
              href="https://minaprotocol.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className={styles.logo}
                src={heroMinaLogo}
                alt="Mina Logo"
                width="191"
                height="174"
                priority
              />
            </a>
            <p className={styles.tagline}>
              built with
              <code className={styles.code}> o1js</code>
            </p>
            <div className={styles.center} style={{ marginTop: "20px" }}>
              {accountDoesNotExist}
              {mainContent}
              {setup}
            </div>
          </div>
        </div>
      </GradientBG >
    </>
  );
}
