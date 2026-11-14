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
              Explore an ecosystem for learning Indian languages and culture
              through people, structured courses, practical resources, and
              Sarvam AI-powered language assistance.
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
                Set up your VartaLang profile, describe your language goals, and
                continue to the learning platform.
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
                Learn how language exchange, jobs, courses, resources, and
                safety features work.
              </p>
              <span className={styles.cardLink}>Browse platform guides →</span>
            </Link>
            <Link
              className={styles.featureCard}
              to="/docs/development/onboarding"
            >
              <span className={styles.cardNumber}>03 / BUILD &amp; INTEGRATE</span>
              <h3>Team onboarding</h3>
              <p>
                Map the repositories, services, data ownership, APIs, and
                operational workflows.
              </p>
              <span className={styles.cardLink}>Open developer onboarding →</span>
            </Link>
          </div>
        </section>

        <section className={styles.vision}>
          <div>
            <p className={styles.sectionEyebrow}>One connected ecosystem</p>
            <h2>Built to make language a bridge.</h2>
            <p>
              VartaLang brings together language exchange, practical learning,
              courses, and opportunity. Sarvam AI supports Indian-language
              translation and message pronunciation in chat.
            </p>
          </div>
          <div className={styles.visionAside}>
            Learn with people, study through courses and resources, and use
            language to connect across cultures and communities.
          </div>
        </section>

        <section
          id="dhawal-shukla"
          className={styles.vision}
          aria-labelledby="builder-title"
        >
          <div>
            <p className={styles.sectionEyebrow}>About the builder</p>
            <h2 id="builder-title">Built and operated by Dhawal Shukla.</h2>
            <p>
              Dhawal currently implements, manages, and operates VartaLang.
              His personal portfolio presents his work and interests across
              software development, interactive terminal experiences, systems,
              and security.
            </p>
            <div className={styles.heroActions}>
              <a
                className={styles.primaryButton}
                href="https://thewittyswan.space"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Dhawal&apos;s portfolio
              </a>
              <a
                className={styles.secondaryButton}
                href="https://rzp.io/rzp/U6FewHU"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buy me an apple
              </a>
            </div>
          </div>
          <div className={styles.visionAside}>
            Open to TPM, SDE, SWE, backend engineering, and PM roles with a
            strong technical edge across India. Ready to relocate.
          </div>
        </section>

        <section className={styles.communityCta}>
          <div>
            <p className={styles.sectionEyebrow}>Ready to explore?</p>
            <h2>Start with the VartaLang introduction.</h2>
            <p>
              Get an overview of the VartaLang products, learning experiences,
              and technical services.
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
