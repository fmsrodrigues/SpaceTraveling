import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { Document } from '@prismicio/client/types/documents';
import { FaSpinner } from 'react-icons/fa';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostDocument {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

function parsePrismicResponse(document: Document): PostDocument {
  return {
    uid: document.uid,
    first_publication_date: document.first_publication_date,
    data: {
      title: document.data.title,
      subtitle: document.data.subtitle,
      banner: document.data.banner,
      author: document.data.author,
      content: document.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  function getReadingTime(): number {
    const words = post.data.content.reduce(
      (acc, content) => {
        let { head, body } = acc;

        if (content.heading) {
          head = [...acc.head, ...content.heading.split(' ')];
        }

        if (content.body) {
          body = RichText.asText([...acc.body, ...content.body]).split(' ');
        }

        return { head, body };
      },
      {
        head: [],
        body: [],
      }
    );

    return Math.ceil((words.body.length + words.head.length) / 200);
  }

  if (router.isFallback) {
    return (
      <div className={styles.postLoading}>
        <FaSpinner />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>
      <Header />
      <main className={styles.postWrapper}>
        <img src={post.data.banner.url} alt="banner" />

        <div className={`${commonStyles.container} ${styles.postContainer}`}>
          <h1>{post.data.title}</h1>

          <div className={styles.postInfo}>
            <div>
              <FiCalendar />
              <time>
                {format(new Date(post.first_publication_date), 'dd LLL yyyy', {
                  locale: ptBR,
                })}
              </time>
            </div>
            <div>
              <FiUser />
              <p>{post.data.author}</p>
            </div>
            <div>
              <FiClock />
              <p>{getReadingTime()} min</p>
            </div>
          </div>

          <div className={styles.postContent}>
            {post.data.content.map((content, i) => (
              <section key={`${String(i)}_${content.heading}`}>
                <h3>{content.heading}</h3>
                <div
                  className={styles.postBody}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: [],
      pageSize: 5,
    }
  );

  return {
    fallback: true,
    paths: posts.results.map(post => ({ params: { slug: post.uid } })),
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const response = await prismic.getByUID(
    'posts',
    String(context.params.slug),
    {}
  );

  return {
    props: {
      post: parsePrismicResponse(response),
    },
  };
};
