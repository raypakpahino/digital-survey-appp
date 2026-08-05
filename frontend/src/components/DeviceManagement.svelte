<script>
  import { onMount } from 'svelte';

  export let currentUser = null;

  let devices = [];
  let availableSurveys = [];
  let isLoading = false;

  let editingDeviceId = null;
  let inputDeviceName = "";
  let inputPin = "1234";
  let selectedForms = ["All Forms"];
  let formMessage = "";
  let formMessageType = "info";

  // DRAGGABLE RESIZER STATE
  let leftPanelWidth = 360;
  let isResizing = false;

  const API_BASE = "/api";

  function startResizing(event) {
    event.preventDefault();
    isResizing = true;
    
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
  }

  function handleMouseMove(event) {
    if (!isResizing) return;
    
    const minWidth = 280;
    const maxWidth = 550;
    const containerOffset = 280; // Accounting for sidebar/padding
    const newWidth = event.clientX - containerOffset;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      leftPanelWidth = newWidth;
    }
  }

  function stopResizing() {
    if (!isResizing) return;
    isResizing = false;

    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopResizing);
  }

  async function loadData() {
    isLoading = true;
    try {
      const devRes = await fetch(`${API_BASE}/devices`);
      const devData = await devRes.json();
      if (devData.success) devices = devData.devices || [];

      const surRes = await fetch(`${API_BASE}/surveys`);
      const surData = await surRes.json();
      if (surData.success) {
        availableSurveys = (surData.surveys || []).filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-"));
      }
    } catch (err) {
      console.warn("Error loading device management data:", err);
    }
    isLoading = false;
  }

  function toggleFormSelection(title) {
    if (title === "All Forms") {
      selectedForms = ["All Forms"];
      return;
    }

    selectedForms = selectedForms.filter(f => f !== "All Forms");

    if (selectedForms.includes(title)) {
      selectedForms = selectedForms.filter(f => f !== title);
      if (selectedForms.length === 0) selectedForms = ["All Forms"];
    } else {
      selectedForms = [...selectedForms, title];
    }
  }

  function startEditDevice(dev) {
    editingDeviceId = dev._id;
    inputDeviceName = dev.deviceName;
    inputPin = dev.accessPin || "1234";
    
    if (Array.isArray(dev.allowedFormTitle)) {
      selectedForms = dev.allowedFormTitle.length > 0 ? dev.allowedFormTitle : ["All Forms"];
    } else if (typeof dev.allowedFormTitle === 'string' && dev.allowedFormTitle.includes(',')) {
      selectedForms = dev.allowedFormTitle.split(',').map(s => s.trim());
    } else {
      selectedForms = [dev.allowedFormTitle || "All Forms"];
    }

    formMessage = `Editing '${dev.deviceName}'. Click 'Save Changes' to update rules.`;
    formMessageType = "info";
  }

  function resetForm() {
    editingDeviceId = null;
    inputDeviceName = "";
    inputPin = "1234";
    selectedForms = ["All Forms"];
    formMessage = "";
  }

  async function handleAddOrUpdateDevice() {
    formMessage = "";
    if (!inputDeviceName.trim()) {
      formMessage = "Device Name is required.";
      formMessageType = "error";
      return;
    }

    if (!inputPin.trim() || inputPin.length < 4) {
      formMessage = "PIN must be at least 4 digits.";
      formMessageType = "error";
      return;
    }

    const payloadForms = selectedForms.length > 0 ? selectedForms : ["All Forms"];

    try {
      let res, data;
      if (editingDeviceId) {
        res = await fetch(`${API_BASE}/devices/${editingDeviceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceName: inputDeviceName.trim(),
            accessPin: inputPin.trim(),
            allowedFormTitle: payloadForms
          })
        });
      } else {
        res = await fetch(`${API_BASE}/devices/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceName: inputDeviceName.trim(),
            accessPin: inputPin.trim(),
            allowedFormTitle: payloadForms,
            loggedInUser: currentUser?.username || "Admin"
          })
        });
      }

      data = await res.json();
      if (data.success) {
        formMessage = `Device access rule saved successfully.`;
        formMessageType = "success";
        resetForm();
        loadData();
      } else {
        formMessage = data.message || "Failed to update device.";
        formMessageType = "error";
      }
    } catch (err) {
      formMessage = "Error connecting to server.";
      formMessageType = "error";
    }
  }

  async function handleDeleteDevice(id) {
    if (!confirm("Remove this registered device?")) return;
    try {
      await fetch(`${API_BASE}/devices/${id}`, { method: "DELETE" });
      devices = devices.filter(d => d._id !== id);
    } catch (err) {
      console.error(err);
    }
  }

  function formatFormDisplay(allowedForms) {
    if (!allowedForms) return "All Forms";
    if (Array.isArray(allowedForms)) {
      if (allowedForms.length === 0 || allowedForms.includes("All Forms")) return "All Forms";
      return allowedForms.join(", ");
    }
    return allowedForms;
  }

  onMount(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  });
</script>

<div class="w-full space-y-8 animate-fade pb-12 box-border relative overflow-visible">
  <!-- TOP HEADER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-[#1a2b6c] dark:text-white">Device & Access Management</h1>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Configure registered client devices, edit access PINs, and set authorized form permissions.</p>
    </div>
    
    <button 
      on:click={loadData} 
      class="bg-[#1a2b6c] hover:bg-[#e31b23] active:bg-[#c2151c] text-white px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 shrink-0 border border-transparent cursor-pointer"
      style="color: #ffffff !important; background-color: #1a2b6c !important;"
    >
      <svg class="w-4 h-4 fill-current shrink-0 {isLoading ? 'animate-spin' : ''}" viewBox="0 0 24 24" style="fill: #ffffff !important;">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
      <span style="color: #ffffff !important; font-weight: 800 !important;">Refresh Devices</span>
    </button>
  </div>

  <!-- FLEX LAYOUT WITH RESIZABLE & STICKY LEFT PANEL -->
  <div class="flex flex-col lg:flex-row items-start gap-0 relative overflow-visible w-full">
    
    <!-- LEFT PANEL: FIXED / STICKY ADD/UPDATE FORM CARD -->
    <div 
      class="w-full shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 lg:sticky lg:top-6 z-20"
      style="width: {leftPanelWidth}px;"
    >
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[10px] font-mono font-extrabold text-[#e31b23] dark:text-rose-400 uppercase tracking-widest block">
            {editingDeviceId ? 'Edit Device Rule' : 'Device Registration'}
          </span>
          <h3 class="text-base font-black text-[#1a2b6c] dark:text-white">
            {editingDeviceId ? 'Update Access PIN & Form' : 'Add / Update Device'}
          </h3>
        </div>
        {#if editingDeviceId}
          <button on:click={resetForm} class="text-[10px] font-extrabold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">Cancel</button>
        {/if}
      </div>
      
      {#if formMessage}
        <div class="text-xs font-bold p-3 rounded-xl border flex items-center space-x-2 {formMessageType === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}">
          <span>{formMessage}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleAddOrUpdateDevice} class="space-y-4">
        <!-- 1. DEVICE NAME INPUT -->
        <div class="space-y-1">
          <label for="dev-name-input" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">1. Device Name</label>
          <input 
            id="dev-name-input"
            type="text" 
            bind:value={inputDeviceName} 
            placeholder="e.g. Charisse's Phone or Tablet-A" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 font-mono font-bold focus:outline-none focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/20 transition-all" 
          />
        </div>

        <!-- 2. ACCESS PIN INPUT -->
        <div class="space-y-1">
          <label for="dev-pin-input" class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">2. Form Access PIN</label>
          <input 
            id="dev-pin-input"
            type="text" 
            maxlength="6"
            bind:value={inputPin} 
            placeholder="e.g. 1234" 
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1a2b6c] dark:text-white font-mono font-bold rounded-xl p-3 focus:outline-none focus:border-[#e31b23] focus:ring-2 focus:ring-[#e31b23]/20 transition-all" 
          />
        </div>

        <!-- 3. AUTHORIZED FORM ACCESS MULTI-SELECT CHECKBOXES -->
        <div class="space-y-2">
          <span class="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">3. Authorized Form Access (Multi-Select)</span>
          
          <div class="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl custom-scrollbar">
            <button 
              type="button"
              on:click={() => toggleFormSelection("All Forms")}
              class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer {selectedForms.includes('All Forms') ? 'bg-[#1a2b6c] text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
            >
              <span>All Available Forms</span>
              {#if selectedForms.includes('All Forms')}<span>✓</span>{/if}
            </button>

            {#each availableSurveys as s}
              {@const isSelected = selectedForms.includes(s.title)}
              <button 
                type="button"
                on:click={() => toggleFormSelection(s.title)}
                class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer {isSelected ? 'bg-[#1a2b6c] text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
              >
                <span class="truncate pr-2">{s.title}</span>
                {#if isSelected}<span>✓</span>{/if}
              </button>
            {/each}
          </div>
        </div>

        <button 
          type="submit" 
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] active:bg-[#c2151c] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 border border-transparent cursor-pointer flex items-center justify-center space-x-2" 
          style="color: #ffffff !important; background-color: #1a2b6c !important;"
        >
          <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" style="fill: #ffffff !important;">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span style="color: #ffffff !important; font-weight: 800 !important;">
            {editingDeviceId ? 'Save Changes' : 'Save Device Access Rule'}
          </span>
        </button>
      </form>
    </div>

    <!-- DRAGGABLE RESIZER HANDLE -->
    <div
      on:mousedown={startResizing}
      class="hidden lg:flex w-5 cursor-col-resize items-center justify-center shrink-0 group transition-colors z-30 self-stretch my-auto py-12"
      title="Drag left/right to resize sections"
    >
      <div class="w-1.5 h-24 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-[#e31b23] group-hover:shadow-md transition-all"></div>
    </div>

    <!-- RIGHT PANEL: SCROLLABLE DEVICE TABLE -->
    <div class="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 min-w-0">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 class="text-xs font-mono font-extrabold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wider">Registered Device Roster</h3>
        <span class="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{devices.length} Total Registered</span>
      </div>

      {#if devices.length === 0}
        <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          No registered devices found. Use the left panel to add device permissions.
        </div>
      {:else}
        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <th class="py-3 px-3">Device Name</th>
                <th class="py-3 px-3">Access PIN</th>
                <th class="py-3 px-3">Authorized Forms</th>
                <th class="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-mono">
              {#each devices as dev (dev._id || dev.deviceName)}
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <!-- 1. DEVICE NAME -->
                  <td class="py-3.5 px-3 font-bold">
                    <div class="flex items-center space-x-2">
                      <span class="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span class="truncate max-w-[180px] font-black text-slate-900 dark:text-white" style="color: var(--dev-name-color, #0f172a);">
                        {dev.deviceName}
                      </span>
                    </div>
                  </td>

                  <!-- 2. ACCESS PIN BADGE -->
                  <td class="py-3.5 px-3">
                    <span class="bg-rose-50 dark:bg-rose-950/60 text-[#e31b23] dark:text-rose-400 px-3 py-1 rounded-md font-mono font-black tracking-widest border border-rose-200 dark:border-rose-900/60 inline-block">
                      {dev.accessPin || dev.pinCode || '1234'}
                    </span>
                  </td>

                  <!-- 3. AUTHORIZED FORMS (MULTI-SELECT DISPLAY) -->
                  <td class="py-3.5 px-3 font-bold">
                    {@const formatted = formatFormDisplay(dev.allowedFormTitle)}
                    <span class="px-3 py-1 rounded-md border text-[11px] font-black inline-block max-w-[220px] truncate {formatted === 'All Forms' ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800/60 text-[#1a2b6c] dark:text-cyan-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'}" title={formatted}>
                      {formatted}
                    </span>
                  </td>

                  <!-- ACTIONS -->
                  <td class="py-3.5 px-3 text-right">
                    <div class="flex items-center justify-end space-x-2">
                      <button 
                        on:click={() => startEditDevice(dev)}
                        class="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#1a2b6c] dark:text-cyan-400 px-3 py-1.5 rounded-xl font-extrabold transition-all duration-150 cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        Edit Rule
                      </button>

                      <button 
                        on:click={() => handleDeleteDevice(dev._id)}
                        class="text-xs bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-3 py-1.5 rounded-xl font-extrabold transition-all duration-150 shadow-xs hover:shadow-md active:scale-95 cursor-pointer border border-transparent"
                        style="color: #ffffff !important; background-color: #e11d48 !important;"
                      >
                        <span style="color: #ffffff !important; font-weight: 800 !important;">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  :global(.dark) {
    --dev-name-color: #ffffff;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>