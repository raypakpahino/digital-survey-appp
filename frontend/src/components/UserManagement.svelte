<script>
  import { onMount } from 'svelte';

  export let currentUser = null;
  export let isQrMode = false;

  let users = [];
  let sites = [];
  let devices = [];
  let isLoading = false;

  // USER FORM STATE
  let editingUserId = null;
  let inputUsername = "";
  let inputPassword = "";
  let selectedRole = isQrMode ? "site_leader" : "kiosk_operator";
  let selectedSites = [];
  let selectedDevices = [];
  let userMessage = "";
  let userMessageType = "info";

  // SITE FORM STATE
  let inputSiteName = "";
  let inputSiteDesc = "";
  let siteMessage = "";
  let siteMessageType = "info";

  const API_BASE = "/api";

  $: if (!editingUserId) {
    selectedRole = isQrMode ? "site_leader" : "kiosk_operator";
  }

  // FILTER DIRECTORY BASED ON ACTIVE ENGINE MODE
  $: filteredUsers = users.filter(u => {
    const r = u.role === 'user' ? 'kiosk_operator' : u.role;
    if (r === 'admin') return true;
    if (isQrMode) {
      return r === 'site_leader';
    } else {
      return r === 'kiosk_operator';
    }
  });

  function parseArrayField(val) {
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'string' && val.trim()) {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  async function loadData() {
    isLoading = true;
    try {
      const [userRes, siteRes, devRes] = await Promise.all([
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/sites`),
        fetch(`${API_BASE}/devices`)
      ]);

      const userData = await userRes.json();
      const siteData = await siteRes.json();
      const devData = await devRes.json();

      if (userData.success) users = userData.users || [];
      if (siteData.success) sites = siteData.sites || [];
      if (devData.success) devices = devData.devices || [];
    } catch (err) {
      console.warn("Error loading records:", err);
    }
    isLoading = false;
  }

  function toggleSiteSelection(siteName) {
    if (selectedSites.includes(siteName)) {
      selectedSites = selectedSites.filter(s => s !== siteName);
    } else {
      selectedSites = [...selectedSites, siteName];
    }
    selectedSites = [...selectedSites];
  }

  function toggleDeviceSelection(devName) {
    if (selectedDevices.includes(devName)) {
      selectedDevices = selectedDevices.filter(d => d !== devName);
    } else {
      selectedDevices = [...selectedDevices, devName];
    }
    selectedDevices = [...selectedDevices];
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
    sites = sites.filter(s => s._id !== siteId);
    try {
      await fetch(`${API_BASE}/sites/${siteId}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
      loadData();
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

    if (isQrMode && selectedRole === 'site_leader' && selectedSites.length === 0) {
      userMessage = "Site Leaders must be assigned to at least one site location.";
      userMessageType = "error";
      return;
    }

    if (!isQrMode && selectedRole === 'kiosk_operator' && selectedDevices.length === 0) {
      userMessage = "Kiosk Operators must be assigned to at least one tablet device.";
      userMessageType = "error";
      return;
    }

    try {
      let res, data;
      const payload = {
        username: inputUsername.trim().toLowerCase(),
        role: selectedRole,
        assignedSites: isQrMode && selectedRole === 'site_leader' ? selectedSites : [],
        assignedDevices: !isQrMode && selectedRole === 'kiosk_operator' ? selectedDevices : [],
        allowedDevices: !isQrMode && selectedRole === 'kiosk_operator' ? selectedDevices : [],
        assignedSite: (isQrMode && selectedRole === 'site_leader' && selectedSites.length > 0) ? selectedSites.join(', ') : ''
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
    selectedRole = u.role === 'user' ? 'kiosk_operator' : u.role;
    
    selectedSites = (Array.isArray(u.assignedSites) && u.assignedSites.length > 0)
      ? u.assignedSites
      : parseArrayField(u.assignedSite);

    selectedDevices = (Array.isArray(u.assignedDevices) && u.assignedDevices.length > 0)
      ? u.assignedDevices
      : parseArrayField(u.allowedDevices);

    userMessage = `Editing user '${u.username}'. Update permissions or site/device assignments below.`;
    userMessageType = "info";
  }

  function resetUserForm() {
    editingUserId = null;
    inputUsername = "";
    inputPassword = "";
    selectedRole = isQrMode ? "site_leader" : "kiosk_operator";
    selectedSites = [];
    selectedDevices = [];
    userMessage = "";
  }

  async function handleDeleteUser(userId) {
    users = users.filter(u => u._id !== userId);

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        console.warn("Failed to delete user on server:", data.message);
        loadData();
      }
    } catch (err) {
      console.error(err);
      loadData();
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
          ? "Configure QR site locations and provision Site Leaders with single or multi-site access." 
          : "Configure Kiosk Operators and scope their access to specific terminal devices."}
      </p>
    </div>
    
    <button 
      type="button"
      on:click={loadData} 
      class="bg-[#1a2b6c] hover:bg-[#e31b23] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center space-x-2 shrink-0 border border-transparent cursor-pointer active:scale-95"
      style="color: #ffffff !important; background-color: #1a2b6c !important;"
    >
      <svg class="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="#ffffff" style="fill: #ffffff !important;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      <span class="font-extrabold" style="color: #ffffff !important; font-weight: 800 !important;">Refresh Directory</span>
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
          <div class="text-xs font-bold p-3 rounded-xl border {siteMessageType === 'success' ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800'}">
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
          <span class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Active Dynamic QR Sites ({sites.length})</span>
          <div class="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {#if sites.length === 0}
              <span class="text-xs text-slate-400 dark:text-slate-500 italic">No QR sites registered yet.</span>
            {:else}
              {#each sites as site}
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <span class="font-bold text-[#1a2b6c] dark:text-cyan-400">{site.name}</span>
                  <button 
                    type="button"
                    on:click={() => handleDeleteSite(site._id)}
                    class="text-rose-600 dark:text-rose-400 hover:text-rose-800 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                  >✕</button>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- ACCOUNT CREATION / EDITING PANEL -->
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
          <button on:click={resetUserForm} class="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer">✕ Cancel Edit</button>
        {/if}
      </div>

      {#if userMessage}
        <div class="text-xs font-bold p-3 rounded-xl border {userMessageType === 'success' ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' : 'bg-rose-50 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800'}">
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
            placeholder={isQrMode ? "e.g. sodexositeleader or googlesiteleader" : "e.g. kiosk_operator_1"} 
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
              <option value="site_leader">Site Leader (Scoped to QR Sites)</option>
              <option value="admin">Administrator (Full Access)</option>
            {:else}
              <option value="kiosk_operator">Kiosk Operator (Scoped to Tablet Devices)</option>
              <option value="admin">Administrator (Full Access)</option>
            {/if}
          </select>
        </div>

        <!-- MULTI-SITE SELECTION CHECKLIST FOR SITE LEADERS -->
        {#if isQrMode && selectedRole === 'site_leader'}
          <div class="space-y-2 pt-1">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-mono font-extrabold text-[#e31b23] dark:text-rose-400 uppercase tracking-widest block">
                Assign Scoped QR Sites ({selectedSites.length} Selected)
              </label>
              {#if sites.length > 0}
                <button 
                  type="button" 
                  on:click={() => selectedSites = selectedSites.length === sites.length ? [] : sites.map(s => s.name)}
                  class="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {selectedSites.length === sites.length ? 'Deselect All' : 'Select All'}
                </button>
              {/if}
            </div>

            <div class="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              {#if sites.length === 0}
                <span class="text-xs text-slate-400 italic">No sites created yet. Create a site first in the left panel.</span>
              {:else}
                {#each sites as site}
                  {@const isChecked = selectedSites.includes(site.name)}
                  <button
                    type="button"
                    on:click={() => toggleSiteSelection(site.name)}
                    class="w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between border cursor-pointer {isChecked ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-500 text-cyan-900 dark:text-cyan-200 font-black shadow-xs ring-1 ring-cyan-400/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'}"
                  >
                    <span class="truncate font-bold">{site.name}</span>
                    
                    <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ml-2 {isChecked ? 'bg-cyan-600 border-cyan-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'}">
                      {#if isChecked}
                        <svg class="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24" style="fill: #ffffff !important;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                      {/if}
                    </div>
                  </button>
                {/each}
              {/if}
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Site Leaders can access and export logs for all assigned locations.</p>
          </div>
        {/if}

        <!-- MULTI-DEVICE SELECTION CHECKLIST FOR KIOSK OPERATORS -->
        {#if !isQrMode && selectedRole === 'kiosk_operator'}
          <div class="space-y-2 pt-1">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-widest block">
                Assign Scoped Tablet Devices ({selectedDevices.length} Selected)
              </label>
              {#if devices.length > 0}
                <button 
                  type="button" 
                  on:click={() => selectedDevices = selectedDevices.length === devices.length ? [] : devices.map(d => d.deviceName)}
                  class="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  {selectedDevices.length === devices.length ? 'Deselect All' : 'Select All'}
                </button>
              {/if}
            </div>

            <div class="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              {#if devices.length === 0}
                <span class="text-xs text-slate-400 italic">No tablet devices registered yet.</span>
              {:else}
                {#each devices as dev}
                  {@const isChecked = selectedDevices.includes(dev.deviceName)}
                  <button
                    type="button"
                    on:click={() => toggleDeviceSelection(dev.deviceName)}
                    class="w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between border cursor-pointer {isChecked ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-black shadow-xs ring-1 ring-emerald-400/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'}"
                  >
                    <span class="truncate flex items-center space-x-1.5 font-bold">
                      <svg class="w-3.5 h-3.5 fill-current text-slate-500 dark:text-slate-400 shrink-0" viewBox="0 0 24 24"><path d="M4 6h16v10H4V6zm16 12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4z"/></svg>
                      <span>{dev.deviceName}</span>
                    </span>
                    
                    <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ml-2 {isChecked ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'}">
                      {#if isChecked}
                        <svg class="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24" style="fill: #ffffff !important;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                      {/if}
                    </div>
                  </button>
                {/each}
              {/if}
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Operators will strictly see response logs originating from their assigned devices.</p>
          </div>
        {/if}

        <button 
          type="submit" 
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          style="color: #ffffff !important; background-color: #1a2b6c !important;"
        >
          <span style="color: #ffffff !important; font-weight: 800 !important;">{editingUserId ? 'Save Account Changes' : 'Save Account'}</span>
        </button>
      </form>
    </div>

    <!-- ROSTER DIRECTORY -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 class="text-xs font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wider">
          {isQrMode ? 'Web QR Users' : 'Enterprise Kiosk Users'}
        </h3>
        <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{filteredUsers.length} Users</span>
      </div>

      <div class="space-y-2.5 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1">
        {#if filteredUsers.length === 0}
          <div class="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic font-mono">
            No accounts configured for this engine mode yet.
          </div>
        {:else}
          {#each filteredUsers as u}
            {@const displayRole = u.role === 'user' ? 'kiosk_operator' : u.role}
            {@const userSites = (Array.isArray(u.assignedSites) && u.assignedSites.length > 0) ? u.assignedSites : parseArrayField(u.assignedSite)}
            {@const userDevs = (Array.isArray(u.assignedDevices) && u.assignedDevices.length > 0) ? u.assignedDevices : (Array.isArray(u.allowedDevices) ? u.allowedDevices : parseArrayField(u.allowedDevices))}

            <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="h-2 w-2 rounded-full {displayRole === 'admin' ? 'bg-purple-500' : (displayRole === 'site_leader' ? 'bg-emerald-500' : 'bg-blue-500')}"></span>
                  <span class="font-black text-xs font-mono user-card-name">{u.username}</span>
                </div>
                
                <span class="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border {displayRole === 'admin' ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800' : (displayRole === 'site_leader' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800')}">
                  {displayRole.replace('_', ' ')}
                </span>
              </div>

              {#if isQrMode && displayRole === 'site_leader'}
                <div class="text-[10px] font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col space-y-1">
                  <span class="font-bold text-slate-500 dark:text-slate-400">Scoped QR Sites ({userSites.length}):</span>
                  <span class="font-black text-[#1a2b6c] dark:text-cyan-300 truncate">
                    {userSites.length > 0 ? userSites.join(', ') : 'Unassigned'}
                  </span>
                </div>
              {:else if !isQrMode && displayRole === 'kiosk_operator'}
                <div class="text-[10px] font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col space-y-1">
                  <span class="font-bold text-slate-500 dark:text-slate-400">Scoped Tablet Devices ({userDevs.length}):</span>
                  <span class="font-black text-emerald-600 dark:text-emerald-400 truncate">
                    {userDevs.length > 0 ? userDevs.join(', ') : 'All Kiosk Devices'}
                  </span>
                </div>
              {/if}

              <div class="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                <button 
                  type="button"
                  on:click={() => startEditUser(u)}
                  class="text-[10px] font-extrabold text-[#1a2b6c] dark:text-cyan-400 hover:underline cursor-pointer"
                >Edit Permissions</button>
                <span class="text-slate-400 dark:text-slate-700 text-[10px]">•</span>
                <button 
                  type="button"
                  on:click={() => handleDeleteUser(u._id)}
                  class="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >Delete</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

  </div>
</div>

<style>
  .user-card-name {
    color: #0f172a !important;
  }
  :global(.dark) .user-card-name {
    color: #ffffff !important;
  }

  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>