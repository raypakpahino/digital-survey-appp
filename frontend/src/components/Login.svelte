<script>
  export let onLoginSuccess = (user, token) => {};

  let username = "";
  let password = "";
  let errorMessage = "";
  let isLoading = false;

  async function handleSubmit() {
    errorMessage = "";
    if (!username.trim() || !password.trim()) {
      errorMessage = "Please enter both username and password.";
      return;
    }

    isLoading = true;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      isLoading = false;

      if (data.success && data.token) {
        localStorage.setItem("sdx_token", data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        errorMessage = data.message || "Invalid username or password.";
      }
    } catch (err) {
      isLoading = false;
      errorMessage = "Unable to connect to authentication server. Ensure backend server is running.";
    }
  }
</script>

<div class="min-h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 box-border transition-colors duration-300">
  <div class="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
    
    <!-- BRANDING HEADER -->
    <div class="text-center space-y-2">
      <div class="h-12 w-12 rounded-2xl bg-cyan-600 flex items-center justify-center font-bold text-xl text-white shadow-lg mx-auto mb-2">
        DS
      </div>
      <h1 class="text-2xl font-black text-navy-950 dark:text-white tracking-tight">
        DigitalSurvey Portal
      </h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Sign in with your assigned account to continue
      </p>
    </div>

    {#if errorMessage}
      <div class="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs px-4 py-3 rounded-xl text-center font-medium">
        ⚠️ {errorMessage}
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div class="space-y-1">
        <label for="username-input" class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Username</label>
        <input
          id="username-input"
          type="text"
          bind:value={username}
          placeholder="e.g. admin or user"
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-navy-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all font-mono"
        />
      </div>

      <div class="space-y-1">
        <label for="password-input" class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Password</label>
        <input
          id="password-input"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-navy-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all font-mono"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 mt-2"
      >
        {isLoading ? "Authenticating..." : "Sign In ➔"}
      </button>
    </form>

    <!-- ADMIN CONTACT NOTICE -->
    <div class="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center space-y-1">
      <p class="text-[11px] text-slate-400 dark:text-slate-500">
        Don't have an account or lost access?
      </p>
      <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Contact your <span class="text-cyan-600 dark:text-cyan-400 font-bold">System Administrator</span> to request account provisioning.
      </p>
    </div>

  </div>
</div>