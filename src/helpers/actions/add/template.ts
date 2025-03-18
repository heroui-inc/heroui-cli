export const templates = {
  '.gitignore': {
    content:
      '# output\n/dist\n\n# ide\n/.idea\n\n# dependencies\n/node_modules\n/.pnp\n.pnp.js\n\n# testing\n/.swc\n/coverage\n__snapshots__\n\n\n# misc\n.DS_Store\n*.pem\n\n# logs\n*.log\n\n# debug\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-debug.log\n\n# local env files\n.env\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\n\n# typescript\n*.tsbuildinfo\n\n# lock\nyarn.lock\npackage-lock.json'
  },
  '.npmrc': {
    content: 'public-hoist-pattern[]=*@heroui/*'
  },
  'README.md': {
    content:
      '# React + Tailwind\n\nThis template provides a minimal setup to get React working in Vite with HMR and some ESLint rules. One top of the standard Vite setup, [tailwindcss](https://tailwindcss.com/) is installed and ready to be used in React components.\n\nAdditional references:\n* [Getting started with Vite](https://vitejs.dev/guide/)\n* [Tailwind documentation](https://tailwindcss.com/docs/installation)\n\n'
  }
};
