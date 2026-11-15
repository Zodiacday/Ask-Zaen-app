<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  let { children } = $props();
</script>

<svelte:head>
  <title>Ask Zaen</title>
  <meta name="description" content="A calm, parent-friendly way to discover thoughtful shows, songs, and stories for children." />
</svelte:head>

<div class="app-shell">
  <Header />
  <main class="app-main">
    {@render children()}
  </main>
</div>
