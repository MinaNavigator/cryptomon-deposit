
import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';
import heroMinaLogo from '../../public/assets/hero-mina-logo.svg';
import arrowRightSmall from '../../public/assets/arrow-right-small.svg';
import { GameDeposit } from '../../../contracts/build/src/gamedeposit.js';
import { Mina, UInt64 } from 'o1js';

export default function Home() {
  const [amount, setAmount] = useState(10);
  const [zkApp, setZkApp] = useState<GameDeposit | null>(null);
  const key = "EKEXqZYRThBdeELB3QLoyFbAZis4R8TtzrFxu1buq4YiDA5a3EAH";
  useEffect(() => {
    (async () => {
      const { Mina, PublicKey } = await import('o1js');
      const { Add, GameDeposit } = await import('../../../contracts/build/src/');

      const devnet = Mina.Network(
        'https://proxy.devney.minaexplorer.com/graphql'
      );
      console.log('Devnet Instance Created');
      Mina.setActiveInstance(devnet);

      // Update this to use the address (public key) for your zkApp account.
      // To try it out, you can try this address for an example "Add" smart contract that we've deployed to
      // Testnet B62qkwohsqTBPsvhYE8cPZSpzJMgoKn4i1LQRuBAtVXWpaT4dgH6WoA.
      const zkAppAddress = 'B62qk5nz4hw6H1gssUqaD88uJcsynU71a7vsUaqx738yscCZxu7Kb2j';

      // This should be removed once the zkAppAddress is updated.
      if (!zkAppAddress) {
        console.error(
          'The following error is caused because the zkAppAddress has an empty string as the public key. Update the zkAppAddress with the public key for your zkApp account, or try this address for an example "Add" smart contract that we deployed to Testnet: B62qkwohsqTBPsvhYE8cPZSpzJMgoKn4i1LQRuBAtVXWpaT4dgH6WoA'
        );
      }
      await window?.mina?.requestAccounts();

      const zkLoad = new GameDeposit(PublicKey.fromBase58(zkAppAddress));
      // console.log("*** compiling ***");
      // await GameDeposit.compile();
      // console.log("*** end compiling ***");
      setZkApp(zkLoad);


    })();
  }, []);

  const deposit = async () => {
    try {
      // This is the public key of the deployed zkapp you want to interact with.
      let accounts = await window.mina?.getAccounts();
      console.log("accounts", accounts);
      let sender: Mina.FeePayerSpec = { sender: accounts[0] };
      let amountMina = amount * 10 ** 9;
      const amountSend: UInt64 = UInt64.from(amountMina);
      console.log("amountMina", amountSend.toJSON());
      const tx = await Mina.transaction(sender, async () => {
        zkApp?.deposit(amountSend);
        zkApp?.requireSignature();
      });
      console.log("tx", tx);

      await tx.prove();

      const { hash } = await window?.mina?.sendTransaction({
        transaction: tx.toJSON(),
        feePayer: {
          fee: '0.1',
        },

      });

      console.log(hash);
    } catch (err) {
      // You may want to show the error message in your UI to the user if the transaction fails.
      console.log(err?.message);
    }
  }

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with o1js" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>
      <GradientBG>
        <main className={styles.main}>
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
          </div>
          <div className='flex-column'>
            <h2>Amount of mina to deposit to cryptomon game</h2>
            <input className='input' placeholder='amount in mina to deposit' type='number' onChange={(event) => setAmount(parseFloat(event.target.value))} value={amount}></input>
            <button className='button' onClick={deposit}>Deposit</button>
          </div>
          <p className={styles.start}>
            Get started by editing
            <code className={styles.code}> src/pages/index.js</code> or <code className={styles.code}> src/pages/index.tsx</code>
          </p>
          <div className={styles.grid}>
            <a
              href="https://docs.minaprotocol.com/zkapps"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>DOCS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Explore zkApps, how to build one, and in-depth references</p>
            </a>
            <a
              href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>TUTORIALS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Learn with step-by-step o1js tutorials</p>
            </a>
            <a
              href="https://discord.gg/minaprotocol"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>QUESTIONS</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Ask questions on our Discord server</p>
            </a>
            <a
              href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
              className={styles.card}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>
                <span>DEPLOY</span>
                <div>
                  <Image
                    src={arrowRightSmall}
                    alt="Mina Logo"
                    width={16}
                    height={16}
                    priority
                  />
                </div>
              </h2>
              <p>Deploy a zkApp to Testnet</p>
            </a>
          </div>
        </main>
      </GradientBG>
    </>
  );
}
