cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
JSON