'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, split } from '@apollo/client';
import { useMemo } from 'react';

function createApolloClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    headers: {
      'x-sp-id': typeof window !== 'undefined' ? localStorage.getItem('activeSpId') || '' : '',
    },
    fetch: (uri, options) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token && options?.headers) {
        (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
      return fetch(uri, options);
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createApolloClient(), []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
