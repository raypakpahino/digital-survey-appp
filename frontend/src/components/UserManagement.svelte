<script>
  import { onMount } from 'svelte';

  export let currentUser = null;
  export let isQrMode = false;

  let users = [];
  let sites = [];
  let isLoading = false;

  // USER FORM STATE
  let editingUserId = null;
  let inputUsername = "";
  let inputPassword = "";
  let selectedRole = isQrMode ? "site_leader" : "kiosk_operator";
  let selectedSite = "";
  let userMessage = "";
  let userMessageType = "info";

  // SITE FORM STATE
  let inputSiteName = "";
  let inputSiteDesc = "";
  let siteMessage = "";
  let siteMessageType = "info";

  const API_BASE = "/api";

  $: selectedRole = isQrMode ? "site_leader" : "kiosk_operator";

  async function loadData() {
    isLoading = true;
    try {
      const [userRes, siteRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/sites`)
      ]);

      const userData = await userRes.json();
      const siteData = await siteRes.json();

      if (userData.success) users = userData.users || [];
      if (siteData.success) {
        sites = siteData.sites || [];
        if (sites.length > 0 && !selectedSite) {
          selectedSite = sites[0].name;
        }
      }
    } catch (err) {
      console.warn("Error loading user records:", err);
    }
    isLoading = false;
  }

  async function handleAddSite() {
    siteMessage = "";
    if (!inputSiteName.trim()) {
      siteMessage = "Site location name is required.";
      siteMessageType = "error";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputSiteName.trim(), description: inputSiteDesc.trim() })
      });
      const data = await res.json();

      if (data.success) {
        siteMessage = `Site '${data.site.name}' added successfully!`;
        siteMessageType = "success";
        inputSiteName = "";
        inputSiteDesc = "";
        loadData();
      } else {
        siteMessage = data.message || "Failed to create site.";
        siteMessageType = "error";
      }
    } catch (err) {
      siteMessage = "Connection error while creating site.";
      siteMessageType = "error";
    }
  }

  async function handleDeleteSite(siteId) {
    if (!confirm("Are you sure you want to delete this site location?")) return;
    try {
      await fetch(`${API_BASE}/sites/${siteId}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveUser() {
    userMessage = "";
    if (!inputUsername.trim()) {
      userMessage = "Username is required.";
      userMessageType = "error";
      return;
    }

    if (!editingUserId && !inputPassword.trim()) {
      userMessage = "Password is required for new users.";
      userMessageType = "error";
      return;
    }

    if (isQrMode && selectedRole === 'site_leader' && !selectedSite) {
      userMessage = "Site Leaders must have an assigned site location.";
      userMessageType = "error";
      return;
    }

    try {
      let res, data;
      const payload = {
        username: inputUsername.trim(),
        role: selectedRole,
        assignedSite: isQrMode && selectedRole === 'site_leader' ? selectedSite : ''
      };
      if (inputPassword.trim()) payload.password = inputPassword.trim();

      if (editingUserId) {
        res = await fetch(`${API_BASE}/users/${editingUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      data = await res.json();
      if (data.success) {
        userMessage = editingUserId ? "User profile updated!" : "New account created successfully!";
        userMessageType = "success";
        resetUserForm();
        loadData();
      } else {
        userMessage = data.message || "Operation failed.";
        userMessageType = "error";
      }
    } catch (err) {
      userMessage = "Error connecting to server.";
      userMessageType = "error";
    }
  }

  function startEditUser(u) {
    editingUserId = u._id;
    inputUsername = u.username;
    inputPassword = "";
    selectedRole = u.role || (isQrMode ? "site_leader" : "kiosk_operator");
    selectedSite = u.assignedSite || (sites.length > 0 ? sites[0].name : "");
    userMessage = `Editing user '${u.username}'. Update permissions below.`;
    userMessageType = "info";
  }

  function resetUserForm() {
    editingUserId = null;
    inputUsername = "";
    inputPassword = "";
    selectedRole = isQrMode ? "site_leader" : "kiosk_operator";
    selectedSite = sites.length > 0 ? sites[0].name : "";
    userMessage = "";
  }

  async function handleDeleteUser(userId) {
    if (!confirm("Permanently delete this user account?")) return;
    try {
      await fetch(`${API_BASE}/users/${userId}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  onMount(loadData);
</script>

<div class="w-full space-y-8 animate-fade pb-12 box-border select-none">
  <!-- TOP HEADER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-[#1a2b6c] dark:text-white">
        {isQrMode ? "Site Leader & Dynamic Site Control" : "Kiosk Operator Management"}
      </h1>
      <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
        {isQrMode 
          ? "Configure public QR site locations and provision Site Leaders with scoped access." 
          : "Configure accounts for Kiosk Operators to view all terminal submission logs."}
      </p>
    </div>
    
    <button 
      on:click={loadData} 
      class="bg-[#1a2b6c] hover:bg-[#e31b23] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center space-x-2 shrink-0 border border-transparent cursor-pointer active:scale-95"
      style="color: #ffffff !important; background-color: #1a2b6c !important;"
    >
      <svg class="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      <span class="font-extrabold" style="color: #ffffff !important;">Refresh Directory</span>
    </button>
  </div>

  <div class="grid grid-cols-1 {isQrMode ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 w-full">
    
    <!-- LEFT COLUMN: DYNAMIC SITE CREATOR (WEB QR MODE ONLY) -->
    {#if isQrMode}
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 h-fit">
        <div class="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span class="text-[10px] font-mono font-extrabold text-[#e31b23] dark:text-rose-400 uppercase tracking-widest block">QR Site Registry</span>
          <h3 class="text-base font-black text-[#1a2b6c] dark:text-white">Create Location Site</h3>
        </div>

        {#if siteMessage}
          <div class="text-xs font-bold p-3 rounded-xl border {siteMessageType === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'}">
            {siteMessage}
          </div>
        {/if}

        <form on:submit|preventDefault={handleAddSite} class="space-y-4">
          <div class="space-y-1">
            <label for="site-name-input" class="text-[10px] font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Location Site Name</label>
            <input 
              id="site-name-input"
              type="text" 
              bind:value={inputSiteName} 
              placeholder="e.g. Sodexo HQ or Site-North" 
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23]" 
            />
          </div>

          <div class="space-y-1">
            <label for="site-desc-input" class="text-[10px] font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Description (Optional)</label>
            <input 
              id="site-desc-input"
              type="text" 
              bind:value={inputSiteDesc} 
              placeholder="e.g. Public QR feedback point" 
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono font-medium rounded-xl p-3 focus:outline-none focus:border-[#e31b23]" 
            />
          </div>

          <button 
            type="submit" 
            class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            style="color: #ffffff !important; background-color: #1a2b6c !important;"
          >
            <span style="color: #ffffff !important; font-weight: 800 !important;">Add Location Site +</span>
          </button>
        </form>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span class="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-wider block">Active Dynamic QR Sites ({sites.length})</span>
          <div class="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {#if sites.length === 0}
              <span class="text-xs text-slate-400 italic">No QR sites registered yet.</span>
            {:else}
              {#each sites as site}
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <span class="font-bold text-[#1a2b6c] dark:text-cyan-400">{site.name}</span>
                  <button 
                    on:click={() => handleDeleteSite(site._id)}
                    class="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  >✕</button>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- ACCOUNT CREATION PANEL -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 h-fit">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div class="space-y-0.5">
          <span class="text-[10px] font-mono font-extrabold text-[#e31b23] dark:text-rose-400 uppercase tracking-widest block">
            {isQrMode ? 'Site Leader Provisioning' : 'Kiosk Operator Provisioning'}
          </span>
          <h3 class="text-base font-black text-[#1a2b6c] dark:text-white">
            {editingUserId ? 'Update User Account' : (isQrMode ? 'Create Site Leader Account' : 'Create Kiosk Operator Account')}
          </h3>
        </div>
        {#if editingUserId}
          <button on:click={resetUserForm} class="text-[10px] font-extrabold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">Cancel</button>
        {/if}
      </div>

      {#if userMessage}
        <div class="text-xs font-bold p-3 rounded-xl border {userMessageType === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'}">
          {userMessage}
        </div>
      {/if}

      <form on:submit|preventDefault={handleSaveUser} class="space-y-4">
        <div class="space-y-1">
          <label for="username-input" class="text-[10px] font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Username</label>
          <input 
            id="username-input"
            type="text" 
            bind:value={inputUsername} 
            disabled={Boolean(editingUserId)}
            placeholder={isQrMode ? "e.g. site_leader_north" : "e.g. kiosk_operator_1"} 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23] disabled:opacity-50" 
          />
        </div>

        <div class="space-y-1">
          <label for="password-input" class="text-[10px] font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">
            {editingUserId ? 'New Password (Leave blank to keep)' : 'Password'}
          </label>
          <input 
            id="password-input"
            type="password" 
            bind:value={inputPassword} 
            placeholder="••••••••" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23]" 
          />
        </div>

        <div class="space-y-1">
          <label for="role-select" class="text-[10px] font-mono font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest block">Assigned Role</label>
          <select 
            id="role-select"
            bind:value={selectedRole}
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23]"
          >
            {#if isQrMode}
              <option value="site_leader">Site Leader (Scoped to QR Site)</option>
              <option value="admin">Administrator (Full Access)</option>
            {:else}
              <option value="kiosk_operator">Kiosk Operator (Unfiltered Kiosk Logs)</option>
              <option value="admin">Administrator (Full Access)</option>
            {/if}
          </select>
        </div>

        {#if isQrMode && selectedRole === 'site_leader'}
          <div class="space-y-1 pt-1">
            <label for="site-assign-select" class="text-[10px] font-mono font-extrabold text-[#e31b23] dark:text-rose-400 uppercase tracking-widest block">Assign Scoped Site Location</label>
            <select 
              id="site-assign-select"
              bind:value={selectedSite}
              class="w-full bg-rose-50/50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 text-xs text-[#1a2b6c] dark:text-rose-200 font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23]"
            >
              {#if sites.length === 0}
                <option value="" disabled>Create a site first in the left panel!</option>
              {:else}
                {#each sites as site}
                  <option value={site.name}>{site.name}</option>
                {/each}
              {/if}
            </select>
            <p class="text-[10px] text-slate-500 mt-1 leading-tight">Site Leaders can ONLY inspect feedback submissions logged under this exact site name.</p>
          </div>
        {/if}

        <button 
          type="submit" 
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          style="color: #ffffff !important; background-color: #1a2b6c !important;"
        >
          <span style="color: #ffffff !important; font-weight: 800 !important;">{editingUserId ? 'Save Changes' : 'Save Account'}</span>
        </button>
      </form>
    </div>

    <!-- ROSTER DIRECTORY -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 class="text-xs font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wider">User Directory</h3>
        <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{users.length} Total Users</span>
      </div>

      <div class="space-y-2.5 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1">
        {#each users as u}
          {@const displayRole = u.role === 'user' ? 'kiosk_operator' : u.role}
          <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="h-2 w-2 rounded-full {displayRole === 'admin' ? 'bg-purple-500' : (displayRole === 'site_leader' ? 'bg-emerald-500' : 'bg-blue-500')}"></span>
                <span class="font-bold text-xs text-slate-900 dark:text-white font-mono">{u.username}</span>
              </div>
              
              <span class="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border {displayRole === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : (displayRole === 'site_leader' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200')}">
                {displayRole.replace('_', ' ')}
              </span>
            </div>

            {#if displayRole === 'site_leader'}
              <div class="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Scoped QR Site:</span>
                <span class="font-black text-[#1a2b6c] dark:text-cyan-300">{u.assignedSite || 'Unassigned'}</span>
              </div>
            {/if}

            <div class="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <button 
                on:click={() => startEditUser(u)}
                class="text-[10px] font-bold text-[#1a2b6c] dark:text-cyan-400 hover:underline cursor-pointer"
              >Edit Permissions</button>
              <span class="text-slate-300 text-[10px]">•</span>
              <button 
                on:click={() => handleDeleteUser(u._id)}
                class="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >Delete</button>
            </div>
          </div>
        {/each}
      </div>
    </div>

  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>