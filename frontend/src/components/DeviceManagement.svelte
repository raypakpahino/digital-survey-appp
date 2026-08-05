<script>
  import { onMount } from 'svelte';

  export let currentUser = null;

  let devices = [];
  let userAccounts = [];
  let isLoading = false;

  let newUsername = "";
  let newPassword = "";
  let newRole = "user";
  let userMsg = "";
  let userMsgType = "info"; // "success" | "error" | "info"

  const API_BASE = "/api";

  async function loadData() {
    isLoading = true;
    try {
      const devRes = await fetch(`${API_BASE}/devices`);
      const devData = await devRes.json();
      if (devData.success) devices = devData.devices || [];

      const usrRes = await fetch(`${API_BASE}/users`);
      const usrData = await usrRes.json();
      if (usrData.success) userAccounts = usrData.users || [];
    } catch (err) {
      console.warn("Error fetching data:", err);
    }
    isLoading = false;
  }

  async function createAccount() {
    userMsg = "";
    if (!newUsername.trim() || !newPassword.trim()) {
      userMsg = "Username and password are required.";
      userMsgType = "error";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        userMsg = `Provisioned user '${newUsername}' successfully.`;
        userMsgType = "success";
        newUsername = "";
        newPassword = "";
        loadData();
      } else {
        userMsg = data.message || "Failed to create user account.";
        userMsgType = "error";
      }
    } catch (err) {
      userMsg = "Unable to connect to provisioning service.";
      userMsgType = "error";
    }
  }

  async function revokeDevice(id) {
    if (!confirm(`Revoke active device session?`)) return;
    try {
      await fetch(`${API_BASE}/devices/${id}`, { method: "DELETE" });
      devices = devices.filter(d => d._id !== id);
    } catch (err) {
      console.error(err);
    }
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  });
</script>

<div class="w-full space-y-8 animate-fade pb-12 box-border">
  <!-- TOP HEADER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-[#1a2b6c] dark:text-white">Device & Access Management</h1>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor active tablet sessions and provision operator credentials.</p>
    </div>
    
    <!-- PROFESSIONAL REFRESH BUTTON WITH SVG ICON -->
    <button 
      on:click={loadData} 
      class="bg-[#1a2b6c] hover:bg-[#e31b23] text-white px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center space-x-2 shrink-0 border border-transparent cursor-pointer"
      style="color: #ffffff !important; background-color: #1a2b6c !important;"
    >
      <svg class="w-4 h-4 fill-current shrink-0 {isLoading ? 'animate-spin' : ''}" viewBox="0 0 24 24" style="fill: #ffffff !important;">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
      <span style="color: #ffffff !important; font-weight: 800 !important;">Refresh Status</span>
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    <!-- LEFT PANEL: PROVISION OPERATOR ACCOUNT -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 h-fit">
      <h3 class="text-xs font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wider">Provision Operator Account</h3>
      
      {#if userMsg}
        <div class="text-xs font-bold p-3 rounded-xl border flex items-center space-x-2 {userMsgType === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}">
          <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            {#if userMsgType === 'success'}
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            {:else}
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            {/if}
          </svg>
          <span>{userMsg}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={createAccount} class="space-y-4">
        <div class="space-y-1">
          <label for="new-username" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Assign Username</label>
          <input 
            id="new-username"
            type="text" 
            bind:value={newUsername} 
            placeholder="e.g. tablet_operator" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 font-mono font-bold focus:outline-none focus:border-[#e31b23]" 
          />
        </div>

        <div class="space-y-1">
          <label for="new-password" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Assign Password</label>
          <input 
            id="new-password"
            type="password" 
            bind:value={newPassword} 
            placeholder="••••••••" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 font-mono font-bold focus:outline-none focus:border-[#e31b23]" 
          />
        </div>

        <div class="space-y-1">
          <label for="new-role" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Role Assignment</label>
          <select 
            id="new-role"
            bind:value={newRole} 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white rounded-xl p-3 font-bold focus:outline-none focus:border-[#e31b23] cursor-pointer"
          >
            <option value="user">Operator / Field Surveyor (User)</option>
            <option value="admin">Administrator (Full Access)</option>
          </select>
        </div>

        <button 
          type="submit" 
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 border border-transparent cursor-pointer flex items-center justify-center space-x-2" 
          style="color: #ffffff !important; background-color: #1a2b6c !important;"
        >
          <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" style="fill: #ffffff !important;">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span style="color: #ffffff !important; font-weight: 800 !important;">Provision User Account</span>
        </button>
      </form>

      <!-- PROVISIONED USERS ROSTER -->
      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <span class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Active User Roster ({userAccounts.length})</span>
        <div class="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {#each userAccounts as usr}
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-xs">
              <span class="font-mono font-bold text-[#1a2b6c] dark:text-slate-200">{usr.username}</span>
              <span 
                class="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase font-mono border"
                style={usr.role === 'admin' ? 'background-color: #1a2b6c !important; color: #ffffff !important; border-color: #1a2b6c !important;' : 'background-color: #e2e8f0 !important; color: #334155 !important; border-color: #cbd5e1 !important;'}
              >
                {usr.role}
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL: LOGGED-IN REGISTERED DEVICES -->
    <div class="lg:col-span-2 space-y-4">
      <h3 class="text-xs font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wider">Registered Client Devices</h3>

      {#if devices.length === 0}
        <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No active paired device sessions found. Devices appear here when operators connect.
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each devices as dev (dev._id)}
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 relative group">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="font-extrabold text-sm text-[#1a2b6c] dark:text-white">{dev.deviceName}</span>
                </div>
                <button 
                  on:click={() => revokeDevice(dev._id)} 
                  class="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900 font-extrabold transition-all cursor-pointer flex items-center space-x-1"
                >
                  <svg class="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  <span>Revoke</span>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
                <div>
                  <span class="text-[9px] uppercase font-mono font-extrabold text-slate-400 block">Status:</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{dev.status}</span>
                </div>
                <div>
                  <span class="text-[9px] uppercase font-mono font-extrabold text-slate-400 block">Logged User:</span>
                  <span class="font-bold text-[#1a2b6c] dark:text-cyan-400 truncate block">{dev.loggedInUser || 'Operator'}</span>
                </div>
                <div class="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span class="text-[9px] uppercase font-mono font-extrabold text-slate-400 block">Assigned Form:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200 truncate block">{dev.pairedSurveyId?.title || 'None'}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>