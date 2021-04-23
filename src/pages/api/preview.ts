import { NextApiRequest, NextApiResponse } from 'next';

import { getPrismicClient } from '../../services/prismic';
import { linkResolver } from './_lib/linkResolver';

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const { documentId, token } = req.query;
  const redirectUrl = await getPrismicClient(req)
    .getPreviewResolver(token as string, documentId as string)
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.setPreviewData({ ref: token });
  res.write(
    `<!DOCTYPE html><html><head><meta http-equiv="Refresh" content="0; url=${redirectUrl}" />
  <script>window.location.href = '${redirectUrl}'</script>
  </head>`
  );
  res.end();
};
