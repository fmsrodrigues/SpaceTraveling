import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect } from 'react';
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
  last_publication_date: string | null;
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
  last_publication_date: string | null;
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
  preview: boolean;
  nextPost: null | {
    id: string;
    title: string;
  };
  previousPost: null | {
    id: string;
    title: string;
  };
}

function parsePrismicResponse(document: Document): PostDocument {
  return {
    uid: document.uid,
    first_publication_date: document.first_publication_date,
    last_publication_date: document.last_publication_date,
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

export default function Post({
  post,
  preview,
  nextPost,
  previousPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');
    script.setAttribute('repo', 'f-maia/SpaceTraveling');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  }, []);

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
              <div>
                <FiCalendar />
                <time>
                  {format(
                    new Date(post.first_publication_date),
                    'dd LLL yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
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
            {!!post.last_publication_date && (
              <div>
                <span>
                  {format(
                    new Date(post.last_publication_date),
                    "'* editado em 'dd MMM yyyy', às 'HH:mm",
                    {
                      locale: ptBR,
                    }
                  )}
                </span>
              </div>
            )}
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

          {(!!previousPost || !!nextPost) && (
            <div className={styles.postNextAndPreviousContainer}>
              <hr />
              <div>
                <div
                  className={`${styles.postNextAndPrevious} ${styles.postPrevious}`}
                >
                  {!!previousPost && (
                    <>
                      <span>{previousPost.title}</span>
                      <Link href={`/post/${previousPost.id}`}>
                        <a>Post anterior</a>
                      </Link>
                    </>
                  )}
                </div>

                <div
                  className={`${styles.postNextAndPrevious} ${styles.postNext}`}
                >
                  {!!nextPost && (
                    <>
                      <span>{nextPost.title}</span>
                      <Link href={`/post/${nextPost.id}`}>
                        <a>Próximo post</a>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {preview && (
            <aside className={styles.postPreview}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}

          <div
            id="inject-comments-for-uterances"
            className={styles.postComments}
          />
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

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = null,
  previewData = {},
}) => {
  const { ref } = previewData;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID(
    'posts',
    params.slug as string,
    ref ? { ref } : null
  );

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const publicationDate =
    response.first_publication_date ??
    format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXXX");

  const nextPost = await prismic.query(
    [
      Prismic.Predicates.at('document.type', 'posts'),
      Prismic.Predicates.dateAfter(
        'document.first_publication_date',
        publicationDate
      ),
    ],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  const previousPost = await prismic.query(
    [
      Prismic.Predicates.at('document.type', 'posts'),
      Prismic.Predicates.dateBefore(
        'document.first_publication_date',
        publicationDate
      ),
    ],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  const nextPostInfo = nextPost.results[0]
    ? {
        id: nextPost.results[0].uid,
        title: nextPost.results[0].data.title,
      }
    : null;

  const previousPostInfo = previousPost.results[0]
    ? {
        id: previousPost.results[0].uid,
        title: previousPost.results[0].data.title,
      }
    : null;

  return {
    props: {
      preview,
      post: parsePrismicResponse(response as Document),
      nextPost: nextPostInfo,
      previousPost: previousPostInfo,
    },
  };
};
