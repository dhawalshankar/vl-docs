import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function Home() {
  return (
    <Layout
      title="VartaLang Documentation"
      description="Guides and technical documentation for the VartaLang ecosystem."
    >
      <main className={styles.homepage}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.statusDot} />
              The VartaLang documentation
            </p>
            <h1>
              Language connects us.
              <br />
              <span>Opportunity grows.</span>
            </h1>
            <p className={styles.heroDescription}>
              Find your way around VartaLang, explore the platform, and follow
              the guides as the documentation takes shape.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} to="/docs/intro">
                Explore the docs <span aria-hidden="true">→</span>
              </Link>
              <a
                className={styles.secondaryButton}
                href="https://vartalang.in"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit VartaLang
              </a>
            </div>
            <p className={styles.heroFootnote}>
              Learn together. Grow across languages.
            </p>
          </div>

          <div className={styles.heroArtwork} aria-label="VartaLang bridge logo">
            <div className={styles.artworkGlow} />
            <div className={styles.artworkCard}>
              <span className={styles.artworkLabel}>A bridge between people</span>
              <img src="/img/logo.png" alt="VartaLang bridge logo" />
              <div className={styles.artworkCaption}>
                <span>Many languages, shared opportunity</span>
                <span className={styles.artworkArrow} aria-hidden="true">↗</span>
              </div>
            </div>
            <span className={`${styles.artworkTag} ${styles.tagLearn}`}>LEARN</span>
            <span className={`${styles.artworkTag} ${styles.tagConnect}`}>CONNECT</span>
          </div>
        </section>

        <div className={styles.heroFooter} aria-hidden="true">
          <span>Language exchange</span>
          <span className={styles.footerLine} />
          <span>Practical learning</span>
          <span className={styles.footerLine} />
          <span>Opportunity</span>
        </div>

        <section className={styles.section} aria-labelledby="guides-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>Find your starting point</p>
              <h2 id="guides-title">A guide for every step.</h2>
            </div>
            <p>
              Browse product guides, learn how the platform is organized, or
              find the planned developer references.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <Link
              className={styles.featureCard}
              to="/docs/getting-started/account-and-profile"
            >
              <span className={styles.cardNumber}>01 / GET STARTED</span>
              <h3>Getting started</h3>
              <p>
                Find the planned guides for starting out and setting up a
                VartaLang account.
              </p>
              <span className={styles.cardLink}>Open getting started →</span>
            </Link>
            <Link
              className={styles.featureCard}
              to="/docs/platform/language-exchange"
            >
              <span className={styles.cardNumber}>02 / USE THE PLATFORM</span>
              <h3>Explore VartaLang</h3>
              <p>
                See the guide structure for language exchange, jobs, learning,
                and trust and safety.
              </p>
              <span className={styles.cardLink}>Browse platform guides →</span>
            </Link>
            <Link
              className={styles.featureCard}
              to="/docs/architecture/overview"
            >
              <span className={styles.cardNumber}>03 / BUILD &amp; INTEGRATE</span>
              <h3>Developer documentation</h3>
              <p>
                Find the planned architecture, local setup, and API reference
                sections.
              </p>
              <span className={styles.cardLink}>View developer docs →</span>
            </Link>
          </div>
        </section>

        <section className={styles.vision}>
          <div>
            <p className={styles.sectionEyebrow}>One connected ecosystem</p>
            <h2>Built to make language a bridge.</h2>
            <p>
              VartaLang brings together language exchange, practical learning,
              and opportunities across its platform. This documentation site
              will grow alongside those experiences.
            </p>
          </div>
          <div className={styles.visionAside}>
            The docs are being organized now. Individual guides will be filled
            in as the next step.
          </div>
        </section>

        <section className={styles.communityCta}>
          <div>
            <p className={styles.sectionEyebrow}>Ready to explore?</p>
            <h2>Start with the VartaLang introduction.</h2>
            <p>
              Get an overview of the documentation and the topics planned for
              this site.
            </p>
          </div>
          <Link className={styles.ctaButton} to="/docs/intro">
            Read the introduction <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </Layout>
  );
}
