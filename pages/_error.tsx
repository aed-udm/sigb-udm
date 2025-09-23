import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialProps?: boolean;
  err?: Error;
}

function Error({ statusCode }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers nos pages d'erreur personnalisées dans l'app directory
    if (statusCode === 404) {
      router.replace('/not-found');
    } else if (statusCode === 500) {
      router.replace('/500');
    } else {
      router.replace('/500');
    }
  }, [statusCode, router]);

  // Rendu minimal pendant la redirection
  return null;
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
