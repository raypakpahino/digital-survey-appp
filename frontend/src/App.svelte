<script>
  import { onMount } from "svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import FormBuilder from "./components/FormBuilder.svelte";
  import Kiosk from "./components/Kiosk.svelte";
  import Answers from "./components/Answers.svelte";
  import Login from "./components/Login.svelte";

  const API_BASE = "/api";

  let activeTab = "surveys";
  let surveysList = [];
  let responses = [];
  let activeSurveyId = "";
  let isOfflineMode = false;
  let isDedicatedKioskMode = false;
  let isSidebarVisible = true;
  let isDarkMode = true;

  // AUTHENTICATION STATE
  let currentUser = null; // { id, username, role }
  let isAuthChecking = true;

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sdx_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sdx_theme', 'light');
    }
  }

  function switchTab(tab) {
    if (currentUser && currentUser.role !== "admin" && tab !== "answers") {
      activeTab = "answers";
      return;
    }
    activeTab = tab;
    if (!isDedicatedKioskMode) {
      if (activeSurveyId && (tab === "builder" || tab === "kiosk" || tab === "answers")) {
        window.location.hash = `/${tab}?id=${activeSurveyId}`;
      } else {
        window.location.hash = `/${tab}`;
      }
    }
  }

  $: if (activeSurveyId) {
    localStorage.setItem("sdx_active_survey_id", activeSurveyId);
    if (!isDedicatedKioskMode && (activeTab === "builder" || activeTab === "kiosk" || activeTab === "answers")) {
      const currentHashPath = window.location.hash.split("?")[0];
      const targetHashPath = `/#/${activeTab}`;
      if (currentHashPath !== targetHashPath || !window.location.hash.includes(`id=${activeSurveyId}`)) {
        window.location.hash = `/${activeTab}?id=${activeSurveyId}`;
      }
    }
  }

  function normalizeSurvey(s) {
    if (!s) return s;
    return {
      ...s,
      questions: (s.questions || []).map((q) => ({
        ...q,
        questionImage: q.questionImage || "",
        isRequired: Boolean(q.isRequired),
        allowMultiple: Boolean(q.allowMultiple),
        enableOptionImages: Boolean(q.enableOptionImages),
        options: q.options || [],
        optionImages: q.optionImages || {},
      })),
    };
  }

  onMount(async () => {
    // Recover Theme Preference
    const savedTheme = localStorage.getItem('sdx_theme');
    if (savedTheme === 'light') {
      isDarkMode = false;
      document.documentElement.classList.remove('dark');
    } else {
      isDarkMode = true;
      document.documentElement.classList.add('dark');
    }

    const hash = window.location.hash;
    const urlParams = new URLSearchParams(
      hash.includes("?") ? hash.split("?")[1] : window.location.search,
    );
    
    const urlSurveyId = urlParams.get("id");
    const savedSurveyId = localStorage.getItem("sdx_active_survey_id");
    const targetSurveyId = urlSurveyId || savedSurveyId || "";

    if (targetSurveyId) {
      activeSurveyId = targetSurveyId;
    }

    if (urlSurveyId && (hash.startsWith("#/kiosk") || window.location.search.includes("id="))) {
      isDedicatedKioskMode = true;
      isSidebarVisible = false;
      activeTab = "kiosk";
      isAuthChecking = false;
      await refreshDataLedger();
      return;
    }

    const storedToken = localStorage.getItem("sdx_token");
    if (storedToken) {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          currentUser = data.user;
          if (currentUser.role !== "admin") {
            activeTab = "answers";
          } else {
            const route = hash.replace("#/", "").split("?")[0];
            if (["surveys", "builder", "kiosk", "answers"].includes(route)) {
              activeTab = route;
            } else {
              window.location.hash = "/surveys";
            }
          }
        } else {
          localStorage.removeItem("sdx_token");
        }
      } catch (err) {
        console.warn("Session validation error:", err);
      }
    }

    isAuthChecking = false;
    await refreshDataLedger();
  });

  function handleLoginSuccess(user, token) {
    currentUser = user;
    if (currentUser.role !== "admin") {
      switchTab("answers");
    } else {
      switchTab("surveys");
    }
    refreshDataLedger();
  }

  function handleLogout() {
    localStorage.removeItem("sdx_token");
    currentUser = null;
  }

  async function refreshDataLedger() {
    try {
      const surveyRes = await fetch(`${API_BASE}/surveys`);
      if (!surveyRes.ok) {
        throw new Error(`HTTP error! status: ${surveyRes.status}`);
      }
      const surveyData = await surveyRes.json();
      if (surveyData.success) {
        surveysList = (surveyData.surveys || []).map(normalizeSurvey);
        isOfflineMode = false;

        if (!activeSurveyId && surveysList.length > 0) {
          activeSurveyId = surveysList[0]._id;
        }
      }

      const responseRes = await fetch(`${API_BASE}/responses`);
      if (responseRes.ok) {
        const responseData = await responseRes.json();
        if (responseData.success && responseData.responses) {
          responses = responseData.responses;
        }
      }
    } catch (err) {
      console.warn("Backend API endpoint unreachable or DB offline:", err);
      isOfflineMode = true;
    }
  }

  $: activeSurveyTitles = surveysList.map((s) => s.title);
  $: validResponsesCount = responses.filter((r) =>
    activeSurveyTitles.includes(r.surveyTitle),
  ).length;

  $: activeSurvey = surveysList.find((s) => s._id === activeSurveyId) || {
    title: "",
    questions: [],
  };

  function handleCreateNewSurvey() {
    if (currentUser?.role !== "admin") return;
    const draftId = `DRAFT-${Date.now()}`;
    const newDraftSurvey = {
      _id: draftId,
      title: "New Custom Form Schema",
      questions: [],
      isDraft: true,
    };

    surveysList = [...surveysList, newDraftSurvey];
    activeSurveyId = draftId;
    switchTab("builder");
  }

  async function persistActiveSurveyState(updatedTitle, updatedQuestions) {
    if (!activeSurveyId || currentUser?.role !== "admin") return;

    activeSurvey.title = updatedTitle;
    activeSurvey.questions = updatedQuestions;

    if (String(activeSurveyId).startsWith("DRAFT-") || activeSurvey.isDraft) {
      try {
        const res = await fetch(`${API_BASE}/surveys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: activeSurvey.title,
            questions: activeSurvey.questions,
          }),
        });
        const data = await res.json();
        if (data.success && data.survey) {
          const normalized = normalizeSurvey(data.survey);
          surveysList = surveysList.map((s) =>
            s._id === activeSurveyId ? normalized : s,
          );
          activeSurveyId = normalized._id;
        }
      } catch (err) {
        console.error("Error creating survey in database:", err);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/surveys/${activeSurveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeSurvey.title,
          questions: activeSurvey.questions,
        }),
      });
      const data = await res.json();
      if (data.success && data.survey) {
        const normalized = normalizeSurvey(data.survey);
        surveysList = surveysList.map((s) =>
          s._id === activeSurveyId ? normalized : s,
        );
      } else {
        await refreshDataLedger();
      }
    } catch (err) {
      console.error("Error updating survey in database:", err);
    }
  }

  async function handleDeleteSurvey(id) {
    if (currentUser?.role !== "admin") return;
    try {
      if (
        !String(id).startsWith("DRAFT-") &&
        !String(id).startsWith("LOCAL-")
      ) {
        await fetch(`${API_BASE}/surveys/${id}`, { method: "DELETE" });
      }
      surveysList = surveysList.filter((s) => s._id !== id);
      if (activeSurveyId === id) {
        activeSurveyId = surveysList[0]?._id || "";
      }
      await refreshDataLedger();
    } catch (err) {
      surveysList = surveysList.filter((s) => s._id !== id);
    }
  }

  async function registerResponse(formattedAnswers, deviceId) {
    try {
      const res = await fetch(`${API_BASE}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyTitle: activeSurvey.title,
          deviceId: deviceId || "Tablet-A",
          answers: formattedAnswers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshDataLedger();
      }
    } catch (err) {}
  }

  function handleSelectAndEdit(id) {
    if (currentUser?.role !== "admin") return;
    activeSurveyId = id;
    switchTab("builder");
  }

  function handleSelectAndTest(id) {
    if (currentUser?.role !== "admin") return;
    activeSurveyId = id;
    switchTab("kiosk");
  }
</script>

{#if isAuthChecking}
  <div class="h-screen w-screen theme-bg-main flex items-center justify-center text-cyan-500 font-mono text-sm overflow-hidden">
    <div class="flex items-center space-x-3">
      <div class="h-3 w-3 rounded-full bg-cyan-500 animate-ping"></div>
      <span class="theme-text-primary">Verifying User Credentials...</span>
    </div>
  </div>

{:else if !currentUser && !isDedicatedKioskMode}
  <!-- UNAUTHENTICATED USER VIEW -->
  <Login onLoginSuccess={handleLoginSuccess} />

{:else}
  <!-- AUTHENTICATED PORTAL WORKSPACE -->
  <div class="flex h-screen w-screen max-w-full max-h-screen theme-bg-main theme-text-primary overflow-hidden m-0 p-0 fixed inset-0">
    
    <!-- SIDEBAR -->
    {#if isSidebarVisible}
      <aside class="w-64 theme-bg-sidebar theme-border border-r flex flex-col justify-between shrink-0 h-full z-40 transition-all duration-300 overflow-hidden text-slate-100">
        <div class="flex flex-col h-full justify-between">
          <div>
            <div class="px-5 h-16 theme-border border-b flex items-center space-x-3 box-border">
              <div class="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
                DS
              </div>
              <span class="font-bold text-base tracking-tight text-white truncate">DigitalSurvey</span>
            </div>

            <nav class="p-4 space-y-1">
              {#if currentUser?.role === "admin"}
                <button
                  class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'surveys' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'}"
                  on:click={async () => {
                    switchTab("surveys");
                    await refreshDataLedger();
                  }}
                >
                  <span>📋</span> <span>Surveys Portal</span>
                </button>

                <button
                  class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'}"
                  on:click={() => switchTab("builder")}
                  disabled={surveysList.length === 0}
                >
                  <span>🛠️</span>
                  <span class={surveysList.length === 0 ? "opacity-40" : ""}>Form Designer</span>
                </button>

                <button
                  class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'kiosk' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'}"
                  on:click={() => {
                    switchTab("kiosk");
                  }}
                >
                  <span>📱</span>
                  <span>Live Kiosk Mode</span>
                </button>
              {/if}

              <button
                class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'answers' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10 hover:text-white'}"
                on:click={async () => {
                  switchTab("answers");
                  await refreshDataLedger();
                }}
              >
                <span>📥</span> <span>Answers Log</span>
              </button>
            </nav>
          </div>

          <div class="p-4 theme-border border-t bg-black/10 text-[11px] text-slate-400 font-medium tracking-wide flex items-center justify-between">
            <span class="truncate">Target: <strong class="text-white">{activeSurvey?.title || "None"}</strong></span>
          </div>
        </div>
      </aside>
    {/if}

    <!-- MAIN BODY CANVAS -->
    <div class="flex-1 flex flex-col h-full min-w-0 max-w-full overflow-hidden relative">
      
      <!-- STICKY TOP NAVIGATION BAR -->
      {#if !isDedicatedKioskMode}
        <header class="sticky top-0 z-30 w-full h-16 theme-bg-card theme-border border-b flex items-center justify-between px-4 sm:px-6 shrink-0 box-border transition-colors duration-300 theme-shadow">
          
          <!-- Left Header: Toggle Sidebar & Branding -->
          <div class="flex items-center space-x-3 min-w-0">
            <button
              on:click={() => (isSidebarVisible = !isSidebarVisible)}
              class="p-2 rounded-xl theme-text-secondary hover:theme-text-primary theme-bg-inner theme-border border transition-all flex items-center justify-center focus:outline-none active:scale-95 shadow-sm shrink-0"
              title={isSidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <span class="text-base leading-none font-bold">☰</span>
            </button>

            {#if !isSidebarVisible}
              <div class="flex items-center space-x-2 shrink-0">
                <div class="h-7 w-7 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  DS
                </div>
                <span class="font-bold text-sm tracking-tight theme-text-primary hidden sm:inline">DigitalSurvey</span>
              </div>
            {/if}
          </div>

          <!-- Right Header: Theme Switcher, User Pill & Sign Out -->
          <div class="flex items-center space-x-3 shrink-0">
            
            <!-- THEME TOGGLE BUTTON -->
            <button
              on:click={toggleTheme}
              class="relative flex items-center px-3 py-1.5 rounded-full theme-border border theme-bg-inner hover:opacity-80 transition-all duration-300 active:scale-95 shadow-inner cursor-pointer"
              title={isDarkMode ? "Switch to Crisp Light Mode" : "Switch to Deep Dark Mode"}
            >
              <div class="flex items-center space-x-2 text-xs font-semibold">
                {#if isDarkMode}
                  <span class="text-amber-400 text-sm">🌙</span>
                  <span class="theme-text-secondary text-[11px] hidden md:inline">Dark</span>
                {:else}
                  <span class="text-amber-500 text-sm">☀️</span>
                  <span class="theme-text-primary text-[11px] font-bold hidden md:inline">Light</span>
                {/if}
              </div>
            </button>

            {#if currentUser}
              <div class="flex items-center space-x-2 theme-bg-inner theme-border border px-3 py-1.5 rounded-xl text-xs font-mono shadow-inner">
                <span class="theme-text-secondary truncate">User: <strong class="theme-text-primary">{currentUser.username}</strong></span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 {currentUser.role === 'admin' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30' : 'theme-bg-card theme-text-secondary'}">
                  {currentUser.role}
                </span>
              </div>

              <button
                on:click={handleLogout}
                class="text-xs text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3.5 py-1.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm flex items-center space-x-1 shrink-0"
              >
                <span>Sign Out</span>
                <span class="text-sm">➔</span>
              </button>
            {/if}

            <div class="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full theme-bg-inner theme-border border text-xs font-mono theme-text-secondary shrink-0">
              <span class="h-2 w-2 rounded-full {isOfflineMode ? 'bg-rose-500' : 'bg-emerald-500'} shadow-sm animate-pulse"></span>
              <span>{isOfflineMode ? "Offline" : "Online"}</span>
            </div>
          </div>
        </header>
      {/if}

      <!-- SCROLLABLE CANVAS -->
      <main class="flex-1 theme-bg-main overflow-y-auto overflow-x-hidden w-full max-w-full box-border transition-colors duration-300 {isDedicatedKioskMode ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}">
        <div class="w-full h-full min-w-0 max-w-full {isDedicatedKioskMode || activeTab === 'kiosk' ? '' : 'max-w-7xl mx-auto'}">
          {#if activeTab === "surveys" && currentUser?.role === "admin"}
            <div class="w-full h-full min-w-0">
              <Dashboard
                surveys={surveysList.filter(
                  (s) => !s.isDraft && !String(s._id).startsWith("DRAFT-"),
                )}
                responseCount={validResponsesCount}
                onCreateSurvey={handleCreateNewSurvey}
                onDeleteSurvey={handleDeleteSurvey}
                onEditSurvey={handleSelectAndEdit}
                onTestSurvey={handleSelectAndTest}
              />
            </div>
          {:else if activeTab === "builder" && currentUser?.role === "admin"}
            <div class="w-full h-full min-w-0">
              <FormBuilder
                surveyTitle={activeSurvey.title}
                questions={activeSurvey.questions}
                surveys={surveysList}
                {activeSurveyId}
                onSelectSurvey={(id) => (activeSurveyId = id)}
                onCreateNewSurvey={handleCreateNewSurvey}
                onSaveSurvey={persistActiveSurveyState}
              />
            </div>
          {:else if activeTab === "kiosk" && (currentUser?.role === "admin" || isDedicatedKioskMode)}
            <div class="w-full h-full min-w-0 flex items-center justify-center">
              <Kiosk
                surveyTitle={activeSurvey.title}
                questions={activeSurvey.questions}
                surveys={surveysList}
                {activeSurveyId}
                onSelectSurvey={(id) => (activeSurveyId = id)}
                onSubmitResponse={registerResponse}
              />
            </div>
          {:else if activeTab === "answers"}
            <div class="w-full h-full min-w-0">
              <Answers
                bind:responses
                bind:activeSurveyId
                surveys={surveysList.filter(
                  (s) => !s.isDraft && !String(s._id).startsWith("DRAFT-"),
                )}
                onRefreshData={refreshDataLedger}
              />
            </div>
          {/if}
        </div>
      </main>

    </div>
  </div>
{/if}