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

  // AUTHENTICATION STATE
  let currentUser = null; // { id, username, role }
  let isAuthChecking = true;

  function switchTab(tab) {
    // If standard user tries to navigate away from answers, enforce restriction
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

  // Auto-sync URL and localStorage whenever activeSurveyId or activeTab changes across all tabs
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
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(
      hash.includes("?") ? hash.split("?")[1] : window.location.search,
    );
    
    // 1. Recover active survey ID from URL parameter or localStorage
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

    // Verify stored JWT session token
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

        // If activeSurveyId is not set yet, default to the first survey in database
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
  <div class="h-screen w-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono text-sm">
    <div class="flex items-center space-x-3">
      <div class="h-3 w-3 rounded-full bg-cyan-400 animate-ping"></div>
      <span>Verifying User Credentials...</span>
    </div>
  </div>

{:else if !currentUser && !isDedicatedKioskMode}
  <!-- UNAUTHENTICATED USER VIEW -->
  <Login onLoginSuccess={handleLoginSuccess} />

{:else}
  <!-- AUTHENTICATED PORTAL WORKSPACE -->
  <div class="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden m-0 p-0 box-border relative">
    
    <!-- FIXED ANCHORED TOGGLE BUTTON -->
    {#if !isDedicatedKioskMode}
      <button
        on:click={() => (isSidebarVisible = !isSidebarVisible)}
        class="fixed top-3 left-3 z-50 p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center focus:outline-none select-none active:scale-95 shadow-lg backdrop-blur-md"
        title={isSidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <span class="text-lg leading-none font-bold">☰</span>
      </button>
    {/if}

    {#if isSidebarVisible}
      <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full z-40 transition-all duration-200">
        <div>
          <div class="pr-5 pl-14 h-16 border-b border-slate-800 flex items-center space-x-3 box-border">
            <div class="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
              DS
            </div>
            <span class="font-bold text-base tracking-tight text-white truncate">DigitalSurvey</span>
          </div>

          <nav class="p-4 space-y-1">
            {#if currentUser?.role === "admin"}
              <button
                class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'surveys' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                on:click={async () => {
                  switchTab("surveys");
                  await refreshDataLedger();
                }}
              >
                <span>📋</span> <span>Surveys Portal</span>
              </button>

              <button
                class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                on:click={() => switchTab("builder")}
                disabled={surveysList.length === 0}
              >
                <span>🛠️</span>
                <span class={surveysList.length === 0 ? "opacity-40" : ""}>Form Designer</span>
              </button>

              <button
                class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'kiosk' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
                on:click={() => {
                  switchTab("kiosk");
                }}
              >
                <span>📱</span>
                <span>Live Kiosk Mode</span>
              </button>
            {/if}

            <button
              class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'answers' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
              on:click={async () => {
                switchTab("answers");
                await refreshDataLedger();
              }}
            >
              <span>📥</span> <span>Answers Log</span>
            </button>
          </nav>
        </div>

        <div class="p-4 border-t border-slate-800 bg-slate-900/50 text-[11px] text-slate-500 font-medium tracking-wide flex items-center justify-between">
          <span class="truncate">Target: <strong class="text-slate-300">{activeSurvey?.title || "None"}</strong></span>
        </div>
      </aside>
    {/if}

    <div class="flex-1 flex flex-col h-full overflow-hidden">
      {#if !isDedicatedKioskMode}
        <header class="w-full h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 box-border shrink-0">
          <div class="flex items-center space-x-4">
            {#if !isSidebarVisible}
              <div class="flex items-center space-x-2 animate-fade pl-10">
                <div class="h-6 w-6 rounded-md bg-cyan-600 flex items-center justify-center font-bold text-xs text-white">
                  DS
                </div>
                <span class="font-bold text-sm tracking-tight text-white">DigitalSurvey</span>
              </div>
            {/if}
          </div>

          <div class="flex items-center space-x-4">
            {#if currentUser}
              <div class="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-mono">
                <span class="text-slate-400">User: <strong class="text-white">{currentUser.username}</strong></span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase {currentUser.role === 'admin' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-300'}">
                  {currentUser.role}
                </span>
              </div>

              <button
                on:click={handleLogout}
                class="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950 border border-rose-900/60 px-3 py-1.5 rounded-xl font-bold transition-all active:scale-95"
              >
                Sign Out ➔
              </button>
            {/if}

            <div class="flex items-center space-x-3 text-xs text-slate-400 font-mono hidden md:flex">
              <span class="h-2 w-2 rounded-full {isOfflineMode ? 'bg-rose-500 shadow-rose-500/50' : 'bg-emerald-500 shadow-emerald-500/50'} shadow-sm"></span>
              <span>{isOfflineMode ? "Offline" : "Online"}</span>
            </div>
          </div>
        </header>
      {/if}

      <main class="flex-1 bg-slate-950 overflow-y-auto w-full box-border {isDedicatedKioskMode ? 'p-0' : 'p-6 md:p-8 lg:p-10'}">
        <div class="w-full h-full {isDedicatedKioskMode || activeTab === 'kiosk' ? '' : 'max-w-7xl mx-auto'}">
          {#if activeTab === "surveys" && currentUser?.role === "admin"}
            <div class="w-full h-full">
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
            <div class="w-full h-full">
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
            <div class="w-full h-full flex items-center justify-center">
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
            <div class="w-full h-full">
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