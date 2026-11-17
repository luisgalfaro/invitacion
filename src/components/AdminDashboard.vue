<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Palette as PaletteIcon,
  FileText as FileTextIcon,
  MapPin as MapPinIcon,
  Link2 as Link2Icon,
  ClipboardCheck as ClipboardCheckIcon,
  Database as DatabaseIcon,
  ExternalLink as ExternalLinkIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  Plus as PlusIcon,
  Trash2 as Trash2Icon,
  RefreshCw as RefreshCwIcon,
  Download as DownloadIcon,
  Crown as CrownIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Eye as EyeIcon,
  Save as SaveIcon,
  CheckCircle2 as CheckCircle2Icon,
  AlertCircle as AlertCircleIcon,
  Search as SearchIcon,
  Shirt as ShirtIcon,
  Gift as GiftIcon,
  Menu as MenuIcon,
  X as XIcon,
  ChevronDown as ChevronDownIcon,
} from 'lucide-vue-next';
import {
  type InvitationConfig,
  type GuestItem,
  type RsvpResponse,
  type ParentMode,
  DEFAULT_CONFIG,
  THEME_PRESETS,
  QUOTE_TEMPLATES,
  DRESS_CODE_PRESETS,
  NO_GIFT_TEMPLATES,
  GOOGLE_APPS_SCRIPT_CODE,
  loadLocalConfig,
  saveLocalConfig,
  loadLocalGuests,
  saveLocalGuests,
  loadLocalRsvps,
  saveLocalRsvps,
  syncConfigToGoogleSheets,
  fetchRsvpsFromGoogleSheets,
  resolveImageUrl,
  extractScriptId,
} from '../utils/invitationStore';

type TabId = 'invitados' | 'respuestas' | 'evento' | 'detalles' | 'diseno' | 'sheets';

const activeTab = ref<TabId>('invitados');
const isMobileMenuOpen = ref(false);

const tabs: { id: TabId; shortLabel: string; fullLabel: string; icon: any }[] = [
  { id: 'invitados', shortLabel: '1. Invitados', fullLabel: '1. Links de Invitados (Pases)', icon: Link2Icon },
  { id: 'respuestas', shortLabel: '2. Respuestas', fullLabel: '2. Respuestas Confirmadas', icon: ClipboardCheckIcon },
  { id: 'evento', shortLabel: '3. Evento y Padres', fullLabel: '3. Evento, Padres y Textos', icon: FileTextIcon },
  { id: 'detalles', shortLabel: '4. Lugar y Regalo', fullLabel: '4. Lugar, Padrinos y Regalo', icon: MapPinIcon },
  { id: 'diseno', shortLabel: '5. Colores y Fotos', fullLabel: '5. Colores e Imágenes (Drive)', icon: PaletteIcon },
  { id: 'sheets', shortLabel: '6. Google Sheets', fullLabel: '6. Conectar Google Sheets', icon: DatabaseIcon },
];

const currentTabInfo = computed(() => {
  return tabs.find((t) => t.id === activeTab.value) || tabs[0];
});

function selectTab(tabId: TabId) {
  activeTab.value = tabId;
  isMobileMenuOpen.value = false;
}

const config = ref<InvitationConfig>(structuredClone(DEFAULT_CONFIG));
const guests = ref<GuestItem[]>([]);
const rsvps = ref<RsvpResponse[]>([]);

// Notificaciones de guardado
const toastMessage = ref('');
const toastType = ref<'success' | 'info' | 'error'>('success');
const isSyncingSheets = ref(false);

// Nuevo invitado para el generador de links
const newGuest = ref({
  nombre: '',
  pases: 2,
  mesa: '',
  telefono: '',
  nota: '',
});
const copiedGuestId = ref<string | null>(null);
const guestSearch = ref('');

// Filtros para la tabla de respuestas (RSVP)
const rsvpSearch = ref('');
const rsvpFilter = ref<'todos' | 'si' | 'no'>('todos');

// Copiar script de Google Sheets
const copiedScript = ref(false);

// Galería nueva URL
const newGalleryUrl = ref('');

function showToast(msg: string, type: 'success' | 'info' | 'error' = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = '';
    }
  }, 4000);
}

function saveAllChanges() {
  saveLocalConfig(config.value);
  saveLocalGuests(guests.value);
  saveLocalRsvps(rsvps.value);
  if (config.value.googleScriptUrl) {
    syncConfigToGoogleSheets(config.value.googleScriptUrl, config.value).catch(() => {});
  }
  showToast('Cambios guardados correctamente.', 'success');
}

async function saveAndSyncCloud() {
  saveAllChanges();
  if (!config.value.googleScriptUrl) {
    showToast('Guardado localmente. Si deseas sincronizar en la nube, configura la pestaña "6. Google Sheets".', 'info');
    return;
  }
  isSyncingSheets.value = true;
  const res = await syncConfigToGoogleSheets(config.value.googleScriptUrl, config.value);
  isSyncingSheets.value = false;
  showToast(res.message, res.ok ? 'success' : 'error');
}

function switchEventType(type: 'xv' | 'boda') {
  config.value.tipoEvento = type;
  if (type === 'xv') {
    config.value.tituloPortada = 'Mis Quince Años';
    config.value.subtituloPortada = 'Una noche mágica para recordar por siempre';
    setXvParentMode(config.value.padresQuinceanera.modalidad || 'ambos');
    config.value.mensajeInicial = QUOTE_TEMPLATES.xvEspecial;
    config.value.tipoMensajeInicial = 'especial';
    config.value.notaVestimenta = 'Se reserva el color Rosa Dorado exclusivamente para la Quinceañera.';
  } else {
    config.value.tituloPortada = 'Nuestra Boda';
    config.value.subtituloPortada = 'Unimos nuestras vidas para siempre';
    config.value.encabezadoPadres = 'Con la bendición de Dios y el amor de nuestras familias';
    config.value.tituloSeccionPadres = 'Nuestros Padres';
    config.value.mensajeInicial = QUOTE_TEMPLATES.bodaEspecial;
    config.value.tipoMensajeInicial = 'especial';
    config.value.notaVestimenta = 'Se reserva el color Blanco y Marfil exclusivamente para la Novia.';
  }
  saveAllChanges();
}

// Configurar plural / singular / femenino / masculino para Padres de XV Años
function setXvParentMode(mode: ParentMode) {
  config.value.padresQuinceanera.modalidad = mode;
  if (mode === 'ambos') {
    config.value.tituloSeccionPadres = 'Mis Padres';
    config.value.encabezadoPadres = 'Con la bendición de Dios y el amor de mis padres';
  } else if (mode === 'madre') {
    config.value.tituloSeccionPadres = 'Mi Madre';
    config.value.encabezadoPadres = 'Con la bendición de Dios y el amor incondicional de mi madre';
  } else if (mode === 'padre') {
    config.value.tituloSeccionPadres = 'Mi Padre';
    config.value.encabezadoPadres = 'Con la bendición de Dios y el amor incondicional de mi padre';
  }
  saveAllChanges();
}

// Configurar plural / singular / femenino / masculino para Padres de la Novia o Novio
function setWeddingParentMode(side: 'novia' | 'novio', mode: ParentMode) {
  if (side === 'novia') {
    config.value.padresNovia.modalidad = mode;
    if (mode === 'ambos') config.value.padresNovia.titulo = 'Padres de la Novia';
    else if (mode === 'madre') config.value.padresNovia.titulo = 'Madre de la Novia';
    else if (mode === 'padre') config.value.padresNovia.titulo = 'Padre de la Novia';
  } else {
    config.value.padresNovio.modalidad = mode;
    if (mode === 'ambos') config.value.padresNovio.titulo = 'Padres del Novio';
    else if (mode === 'madre') config.value.padresNovio.titulo = 'Madre del Novio';
    else if (mode === 'padre') config.value.padresNovio.titulo = 'Padre del Novio';
  }
  saveAllChanges();
}

function applyQuotePreset(presetKey: 'xv' | 'boda' | 'bib1' | 'bib2' | 'bib3') {
  if (presetKey === 'xv') {
    config.value.tipoMensajeInicial = 'especial';
    config.value.mensajeInicial = QUOTE_TEMPLATES.xvEspecial;
  } else if (presetKey === 'boda') {
    config.value.tipoMensajeInicial = 'especial';
    config.value.mensajeInicial = QUOTE_TEMPLATES.bodaEspecial;
  } else if (presetKey === 'bib1') {
    config.value.tipoMensajeInicial = 'biblico';
    config.value.mensajeInicial = QUOTE_TEMPLATES.biblico1;
    config.value.citaBiblicaAutor = QUOTE_TEMPLATES.biblico1Autor;
  } else if (presetKey === 'bib2') {
    config.value.tipoMensajeInicial = 'biblico';
    config.value.mensajeInicial = QUOTE_TEMPLATES.biblico2;
    config.value.citaBiblicaAutor = QUOTE_TEMPLATES.biblico2Autor;
  } else if (presetKey === 'bib3') {
    config.value.tipoMensajeInicial = 'biblico';
    config.value.mensajeInicial = QUOTE_TEMPLATES.biblico3;
    config.value.citaBiblicaAutor = QUOTE_TEMPLATES.biblico3Autor;
  }
  saveAllChanges();
}

function applyThemePreset(presetId: string) {
  const found = THEME_PRESETS.find((p) => p.id === presetId);
  if (!found) return;
  config.value.colores = { ...found.colores };
  saveAllChanges();
  showToast(`Paleta "${found.nombre}" aplicada.`, 'success');
}

// Padrinos y Corte de Honor
function addPadrino() {
  config.value.padrinos.push({
    id: `pad_${Date.now()}`,
    rol: 'Padrinos de Honor',
    nombres: '',
  });
}

function removePadrino(index: number) {
  config.value.padrinos.splice(index, 1);
  saveAllChanges();
}

function addCorteMember() {
  config.value.corteHonor.push({
    id: `cor_${Date.now()}`,
    rol: 'Dama de Honor',
    nombre: '',
  });
}

function removeCorteMember(index: number) {
  config.value.corteHonor.splice(index, 1);
  saveAllChanges();
}

// Galería de fotos
function addGalleryImage() {
  if (!newGalleryUrl.value.trim()) return;
  config.value.imagenes.galeriaUrls.push(newGalleryUrl.value.trim());
  newGalleryUrl.value = '';
  saveAllChanges();
}

function removeGalleryImage(index: number) {
  config.value.imagenes.galeriaUrls.splice(index, 1);
  saveAllChanges();
}

// Generador de Links de Invitados
function buildGuestLink(guest: GuestItem): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tu-invitacion.com';
  const url = new URL('/', baseUrl);
  url.searchParams.set('invitado', guest.nombre);
  url.searchParams.set('pases', String(guest.pases));
  if (guest.mesa && guest.mesa.trim()) {
    url.searchParams.set('mesa', guest.mesa.trim());
  }
  if (config.value.googleScriptUrl && config.value.googleScriptUrl.trim()) {
    url.searchParams.set('s', extractScriptId(config.value.googleScriptUrl));
  }
  return url.toString();
}

function buildGuestWhatsappUrl(guest: GuestItem): string {
  const link = buildGuestLink(guest);
  const phone = (guest.telefono || '').replace(/\D/g, '');
  const eventTitle =
    config.value.tipoEvento === 'xv'
      ? `los XV Años de *${config.value.nombreQuinceanera}*`
      : `la Boda de *${config.value.nombreNovia} y ${config.value.nombreNovio}*`;

  const text =
    `✨ ¡Hola *${guest.nombre}*! ✨\n\n` +
    `Con mucha ilusión queremos invitarte a celebrar con nosotros ${eventTitle}.\n\n` +
    `🎟️ Hemos reservado *${guest.pases} ${guest.pases === 1 ? 'pase' : 'pases'}* para ti.\n` +
    `👇 Abre tu invitación digital personalizada y confirma tu asistencia aquí:\n${link}`;

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function addGuest() {
  if (!newGuest.value.nombre.trim()) {
    showToast('Escribe el nombre de la persona o familia invitada.', 'error');
    return;
  }
  guests.value.unshift({
    id: `g_${Date.now()}`,
    nombre: newGuest.value.nombre.trim(),
    pases: Math.max(1, Math.min(25, Number(newGuest.value.pases) || 1)),
    mesa: newGuest.value.mesa.trim(),
    telefono: newGuest.value.telefono.trim(),
    nota: newGuest.value.nota.trim(),
    enviado: false,
  });
  newGuest.value = { nombre: '', pases: 2, mesa: '', telefono: '', nota: '' };
  saveLocalGuests(guests.value);
  showToast('Invitado agregado y link generado.', 'success');
}

function removeGuest(id: string) {
  guests.value = guests.value.filter((g) => g.id !== id);
  saveLocalGuests(guests.value);
}

async function copyGuestLink(guest: GuestItem) {
  const link = buildGuestLink(guest);
  try {
    await navigator.clipboard.writeText(link);
    copiedGuestId.value = guest.id;
    setTimeout(() => {
      if (copiedGuestId.value === guest.id) copiedGuestId.value = null;
    }, 2500);
    showToast(`Link de "${guest.nombre}" copiado al portapapeles.`, 'success');
  } catch {
    showToast('No se pudo copiar automáticamente.', 'error');
  }
}

const filteredGuests = computed(() => {
  const q = guestSearch.value.trim().toLowerCase();
  if (!q) return guests.value;
  return guests.value.filter(
    (g) =>
      g.nombre.toLowerCase().includes(q) ||
      (g.mesa && g.mesa.toLowerCase().includes(q)) ||
      (g.nota && g.nota.toLowerCase().includes(q))
  );
});

const totalAllocatedPasses = computed(() =>
  guests.value.reduce((acc, g) => acc + (Number(g.pases) || 0), 0)
);

// Estadísticas y filtros de Respuestas (RSVP)
const filteredRsvps = computed(() => {
  const q = rsvpSearch.value.trim().toLowerCase();
  return rsvps.value.filter((r) => {
    const matchesStatus = rsvpFilter.value === 'todos' || r.asistira === rsvpFilter.value;
    const matchesQuery =
      !q ||
      r.nombreConfirmado.toLowerCase().includes(q) ||
      r.invitadoParam.toLowerCase().includes(q) ||
      (r.mensaje && r.mensaje.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });
});

const rsvpStats = computed(() => {
  const totalRespuestas = rsvps.value.length;
  const confirmadosSi = rsvps.value.filter((r) => r.asistira === 'si');
  const confirmadosNo = rsvps.value.filter((r) => r.asistira === 'no');
  const totalPersonasConfirmadas = confirmadosSi.reduce(
    (sum, r) => sum + (Number(r.cantidadPersonas) || 0),
    0
  );
  return {
    totalRespuestas,
    familiasAsistiran: confirmadosSi.length,
    familiasNoAsistiran: confirmadosNo.length,
    totalPersonasConfirmadas,
  };
});

async function refreshRsvpsFromCloud() {
  isSyncingSheets.value = true;
  const result = await fetchRsvpsFromGoogleSheets(config.value.googleScriptUrl);
  rsvps.value = result.rsvps;
  isSyncingSheets.value = false;
  showToast(result.message, result.ok ? 'success' : 'info');
}

function exportRsvpsToCsv() {
  const headers = [
    'Fecha',
    'Invitación Dirigida A',
    'Nombre que Confirma',
    'Asistirá',
    'Personas Confirmadas',
    'Cupo Máximo',
    'Teléfono',
    'Mensaje',
  ];
  const rows = rsvps.value.map((r) => [
    `"${(r.fechaRegistro || '').replace(/"/g, '""')}"`,
    `"${(r.invitadoParam || '').replace(/"/g, '""')}"`,
    `"${(r.nombreConfirmado || '').replace(/"/g, '""')}"`,
    r.asistira === 'si' ? 'SÍ' : 'NO',
    r.cantidadPersonas,
    r.pasesMaximos,
    `"${(r.telefono || '').replace(/"/g, '""')}"`,
    `"${(r.mensaje || '').replace(/"/g, '""')}"`,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `confirmaciones-${config.value.tipoEvento}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyAppsScriptCode() {
  try {
    await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    copiedScript.value = true;
    setTimeout(() => {
      copiedScript.value = false;
    }, 3000);
    showToast('Código de Google Apps Script copiado.', 'success');
  } catch {
    showToast('Error al copiar código.', 'error');
  }
}

onMounted(() => {
  config.value = loadLocalConfig();
  guests.value = loadLocalGuests();
  rsvps.value = loadLocalRsvps();
});
</script>

<template>
  <div
    class="min-h-dvh bg-stone-100 text-stone-900 pb-20"
    :style="{ '--color-primary': config.colores.primario }"
  >
    <!-- =================================================================== -->
    <!-- BARRA SUPERIOR CON MENÚ HAMBURGUESA EXPANDIBLE EN MÓVIL             -->
    <!-- =================================================================== -->
    <header class="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-2xs">
      <div class="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
        <!-- Fila principal de Cabecera -->
        <div class="flex items-center justify-between gap-2">
          <!-- Marca / Título -->
          <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm sm:h-11 sm:w-11"
              :style="{ backgroundColor: config.colores.primario }"
            >
              <CrownIcon v-if="config.tipoEvento === 'xv'" class="h-5 w-5 sm:h-6 sm:w-6" />
              <HeartIcon v-else class="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 class="truncate text-sm font-bold text-stone-900 sm:text-xl">
                  Panel Administrador
                </h1>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white sm:px-2.5 sm:text-xs"
                  :style="{ backgroundColor: config.colores.primario }"
                >
                  {{ config.tipoEvento === 'xv' ? 'XV Años' : 'Boda' }}
                </span>
              </div>
              <p class="hidden text-xs text-stone-500 sm:block">
                Personaliza colores, padres, vestimenta, regalos, links de invitados y Google Sheets
              </p>
            </div>
          </div>

          <!-- Acciones rápidas (Escritorio) + Botón Hamburguesa (Móvil/Tablet < lg) -->
          <div class="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              class="hidden min-h-10 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 sm:inline-flex"
            >
              <EyeIcon class="h-4 w-4 shrink-0 text-stone-600" />
              <span>Ver Invitación</span>
              <ExternalLinkIcon class="h-3.5 w-3.5 shrink-0 opacity-60" />
            </a>

            <button
              type="button"
              :disabled="isSyncingSheets"
              @click="saveAndSyncCloud"
              class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 cursor-pointer sm:px-4"
              :style="{ backgroundColor: config.colores.primario }"
            >
              <SaveIcon class="h-4 w-4 shrink-0" />
              <span>{{ isSyncingSheets ? 'Guardando...' : 'Guardar' }}</span>
            </button>

            <!-- Botón de Menú Hamburguesa (Solo en Móvil / Tablet < lg) -->
            <button
              type="button"
              :aria-expanded="isMobileMenuOpen ? 'true' : 'false'"
              aria-controls="mobile-admin-menu"
              aria-label="Abrir menú de secciones"
              @click="isMobileMenuOpen = !isMobileMenuOpen"
              class="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-800 transition hover:bg-stone-100 lg:hidden cursor-pointer"
            >
              <XIcon v-if="isMobileMenuOpen" class="h-5 w-5 shrink-0 text-stone-800" />
              <MenuIcon v-else class="h-5 w-5 shrink-0 text-stone-800" />
              <span>Menú</span>
            </button>
          </div>
        </div>

        <!-- Barra indicadora de sección actual en Móvil (cuando el menú está cerrado) -->
        <div class="mt-2.5 flex items-center justify-between lg:hidden">
          <button
            type="button"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50/90 px-3.5 py-2 text-left text-xs font-bold text-stone-800 transition hover:bg-stone-100 cursor-pointer"
          >
            <span class="flex items-center gap-2">
              <component
                :is="currentTabInfo.icon"
                class="h-4 w-4 shrink-0"
                :style="{ color: config.colores.primario }"
              />
              <span>Sección activa: <strong>{{ currentTabInfo.fullLabel }}</strong></span>
            </span>
            <ChevronDownIcon
              class="h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200"
              :class="{ 'rotate-180': isMobileMenuOpen }"
            />
          </button>
        </div>

        <!-- Menú Expandible Hamburguesa para Móviles y Tablets (< lg) -->
        <nav
          v-if="isMobileMenuOpen"
          id="mobile-admin-menu"
          aria-label="Menú móvil de secciones"
          class="mt-2 space-y-1.5 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-lg lg:hidden"
        >
          <button
            v-for="tab in tabs"
            :key="`mob-${tab.id}`"
            type="button"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="selectTab(tab.id)"
            class="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-xs font-bold transition cursor-pointer sm:text-sm"
            :class="
              activeTab === tab.id
                ? 'text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-100'
            "
            :style="activeTab === tab.id ? { backgroundColor: config.colores.primario } : {}"
          >
            <span class="flex items-center gap-2.5">
              <component :is="tab.icon" class="h-4 w-4 shrink-0" />
              <span>{{ tab.fullLabel }}</span>
            </span>
            <CheckIcon v-if="activeTab === tab.id" class="h-4 w-4 shrink-0" />
          </button>

          <div class="border-t border-stone-100 pt-2 sm:hidden">
            <a
              href="/"
              target="_blank"
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs font-bold text-stone-700"
            >
              <EyeIcon class="h-4 w-4 shrink-0" />
              <span>Abrir Vista Previa de Invitación</span>
              <ExternalLinkIcon class="h-3.5 w-3.5 shrink-0 opacity-60" />
            </a>
          </div>
        </nav>

        <!-- Barra de Navegación en Escritorio (lg y superior, sin barras de scroll) -->
        <nav
          aria-label="Secciones de configuración de la invitación"
          class="mt-3 hidden lg:grid lg:grid-cols-6 lg:gap-2"
        >
          <button
            v-for="tab in tabs"
            :key="`desk-${tab.id}`"
            :id="`tab-${tab.id}`"
            type="button"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="selectTab(tab.id)"
            class="flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer"
            :class="
              activeTab === tab.id
                ? 'border-transparent text-white shadow-xs'
                : 'border-stone-200 bg-stone-50/80 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            "
            :style="activeTab === tab.id ? { backgroundColor: config.colores.primario } : {}"
          >
            <component :is="tab.icon" class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ tab.shortLabel }}</span>
          </button>
        </nav>
      </div>
    </header>

    <!-- Notificación flotante (Toast) -->
    <div
      v-if="toastMessage"
      role="status"
      aria-live="polite"
      class="fixed right-3 bottom-4 left-3 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl transition sm:right-5 sm:bottom-5 sm:left-auto sm:max-w-md sm:px-5 sm:py-3.5 sm:text-sm"
      :class="{
        'border-emerald-200 bg-emerald-900 text-white': toastType === 'success',
        'border-stone-200 bg-stone-900 text-white': toastType === 'info',
        'border-red-200 bg-red-800 text-white': toastType === 'error',
      }"
    >
      <CheckCircle2Icon v-if="toastType === 'success'" class="h-5 w-5 shrink-0 text-emerald-300" />
      <AlertCircleIcon v-else class="h-5 w-5 shrink-0 text-amber-300" />
      <span>{{ toastMessage }}</span>
    </div>

    <main class="mx-auto max-w-7xl px-3 pt-5 sm:px-6 sm:pt-8">
      <!-- ================================================================= -->
      <!-- TAB 1: GENERADOR DE LINKS DE INVITADOS CON PASES                  -->
      <!-- ================================================================= -->
      <section
        v-if="activeTab === 'invitados'"
        key="panel-invitados"
        aria-labelledby="tab-invitados"
      >
        <div class="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <!-- Columna izquierda: Crear nuevo link personalizado -->
          <div class="lg:col-span-4">
            <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
              <div class="flex items-center gap-2.5">
                <Link2Icon class="h-5 w-5 shrink-0 text-pink-700" />
                <h2 class="text-base font-bold sm:text-lg">Crear Link Personalizado</h2>
              </div>
              <p class="mt-1 text-xs text-stone-500">
                Cada link lleva en sus parámetros el nombre del invitado y la cantidad máxima de personas que puede confirmar.
              </p>

              <form class="mt-5 space-y-4" @submit.prevent="addGuest">
                <div>
                  <label for="guest-name" class="block text-xs font-bold text-stone-700">
                    Nombre de la Persona o Familia <span aria-hidden="true" class="text-red-600">*</span>
                  </label>
                  <input
                    id="guest-name"
                    v-model="newGuest.nombre"
                    type="text"
                    required
                    aria-describedby="guest-name-help"
                    class="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                  />
                  <span id="guest-name-help" class="mt-1 block text-xs text-stone-500">
                    Ej: Familia Henríquez López o Sra. Carmen de Rivas
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label for="guest-passes" class="block text-xs font-bold text-stone-700">
                      Cantidad de Pases <span aria-hidden="true" class="text-red-600">*</span>
                    </label>
                    <input
                      id="guest-passes"
                      v-model.number="newGuest.pases"
                      type="number"
                      min="1"
                      max="25"
                      required
                      class="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label for="guest-table" class="block text-xs font-bold text-stone-700">
                      Mesa (Opcional)
                    </label>
                    <input
                      id="guest-table"
                      v-model="newGuest.mesa"
                      type="text"
                      class="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label for="guest-phone" class="block text-xs font-bold text-stone-700">
                    WhatsApp del Invitado (Opcional)
                  </label>
                  <input
                    id="guest-phone"
                    v-model="newGuest.telefono"
                    type="tel"
                    inputmode="tel"
                    aria-describedby="guest-phone-help"
                    class="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                  />
                  <span id="guest-phone-help" class="mt-1 block text-xs text-stone-500">
                    Con código de país, ej: 50371234567
                  </span>
                </div>

                <button
                  type="submit"
                  class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 cursor-pointer"
                  :style="{ backgroundColor: config.colores.primario }"
                >
                  <PlusIcon class="h-4 w-4 shrink-0" />
                  <span>Generar Link de Invitación</span>
                </button>
              </form>
            </div>
          </div>

          <!-- Columna derecha: Lista de links generados para copiar y enviar -->
          <div class="lg:col-span-8">
            <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="text-base font-bold sm:text-lg">
                    Lista de Invitados ({{ guests.length }} invitaciones • {{ totalAllocatedPasses }} pases)
                  </h2>
                  <p class="text-xs text-stone-500">
                    Copia el link personalizado o envíalo directo por WhatsApp con un clic.
                  </p>
                </div>

                <div role="search" class="w-full sm:w-64">
                  <div class="relative">
                    <SearchIcon class="pointer-events-none absolute top-3 left-3 h-4 w-4 text-stone-400" />
                    <label for="search-guests" class="visually-hidden">Buscar invitado</label>
                    <input
                      id="search-guests"
                      v-model="guestSearch"
                      type="search"
                      class="w-full rounded-xl border border-stone-300 py-2 pr-3 pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div class="mt-5 space-y-3 sm:mt-6">
                <div
                  v-for="guest in filteredGuests"
                  :key="guest.id"
                  class="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition hover:border-stone-300"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-sm font-bold text-stone-900 sm:text-base">{{ guest.nombre }}</h3>
                        <span
                          class="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                          :style="{ backgroundColor: config.colores.primario }"
                        >
                          {{ guest.pases }} {{ guest.pases === 1 ? 'pase' : 'pases' }}
                        </span>
                        <span
                          v-if="guest.mesa"
                          class="rounded-full border border-stone-300 bg-white px-2.5 py-0.5 text-xs font-medium text-stone-700"
                        >
                          {{ guest.mesa }}
                        </span>
                      </div>
                      <code class="mt-1.5 block font-mono text-[11px] text-stone-500 sm:text-xs">
                        {{ buildGuestLink(guest) }}
                      </code>
                    </div>

                    <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      <button
                        type="button"
                        @click="copyGuestLink(guest)"
                        class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-800 shadow-2xs transition hover:bg-stone-100 cursor-pointer"
                      >
                        <CheckIcon v-if="copiedGuestId === guest.id" class="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <CopyIcon v-else class="h-3.5 w-3.5 shrink-0 text-stone-600" />
                        <span>{{ copiedGuestId === guest.id ? '¡Copiado!' : 'Copiar Link' }}</span>
                      </button>

                      <a
                        :href="buildGuestWhatsappUrl(guest)"
                        target="_blank"
                        rel="noopener noreferrer"
                        @click="guest.enviado = true; saveLocalGuests(guests)"
                        class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                      >
                        <MessageCircleIcon class="h-3.5 w-3.5 shrink-0" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        :href="buildGuestLink(guest)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                        title="Probar cómo ve la invitación este invitado"
                      >
                        <ExternalLinkIcon class="h-3.5 w-3.5 shrink-0" />
                        <span>Probar</span>
                      </a>

                      <button
                        type="button"
                        @click="removeGuest(guest.id)"
                        class="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 cursor-pointer"
                        aria-label="Eliminar invitado"
                      >
                        <Trash2Icon class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- TAB 2: RESPUESTAS Y CONFIRMACIONES (DESDE GOOGLE SHEETS)          -->
      <!-- ================================================================= -->
      <section
        v-else-if="activeTab === 'respuestas'"
        key="panel-respuestas"
        aria-labelledby="tab-respuestas"
      >
        <!-- Resumen de métricas -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
            <span class="text-xs font-bold tracking-wider uppercase text-stone-400">Respuestas Recibidas</span>
            <p class="mt-2 text-3xl font-extrabold text-stone-900">{{ rsvpStats.totalRespuestas }}</p>
            <span class="text-xs text-stone-500">Formularios enviados</span>
          </div>

          <div class="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
            <span class="text-xs font-bold tracking-wider uppercase text-emerald-700">Total Personas Confirmadas</span>
            <p class="mt-2 text-3xl font-extrabold text-emerald-800">{{ rsvpStats.totalPersonasConfirmadas }}</p>
            <span class="text-xs text-emerald-700">En {{ rsvpStats.familiasAsistiran }} invitaciones que sí asisten</span>
          </div>

          <div class="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs">
            <span class="text-xs font-bold tracking-wider uppercase text-amber-800">No Podrán Asistir</span>
            <p class="mt-2 text-3xl font-extrabold text-amber-900">{{ rsvpStats.familiasNoAsistiran }}</p>
            <span class="text-xs text-amber-700">Invitaciones declinadas</span>
          </div>

          <div class="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
            <span class="text-xs font-bold tracking-wider uppercase text-stone-400">Acciones con Google Sheets</span>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                :disabled="isSyncingSheets"
                @click="refreshRsvpsFromCloud"
                class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                :style="{ backgroundColor: config.colores.primario }"
              >
                <RefreshCwIcon class="h-3.5 w-3.5 shrink-0" :class="{ 'animate-spin': isSyncingSheets }" />
                <span>Sincronizar Sheets</span>
              </button>
              <button
                type="button"
                @click="exportRsvpsToCsv"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <DownloadIcon class="h-3.5 w-3.5 shrink-0" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tabla de Confirmaciones -->
        <div class="mt-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6">
          <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="rsvp-table-caption" class="text-base font-bold sm:text-lg">
                Registro de Confirmaciones de Asistencia
              </h2>
              <p class="text-xs text-stone-500">
                Consulta todas las respuestas sin necesidad de entrar a la hoja de cálculo de Google Sheets.
              </p>
            </div>

            <div role="search" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div>
                <label for="filter-rsvp-status" class="visually-hidden">Filtrar por asistencia</label>
                <select
                  id="filter-rsvp-status"
                  v-model="rsvpFilter"
                  class="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold sm:w-auto"
                >
                  <option value="todos">Todas las respuestas</option>
                  <option value="si">Solo quienes SÍ asisten</option>
                  <option value="no">Solo quienes NO asisten</option>
                </select>
              </div>
              <div class="relative">
                <SearchIcon class="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-400" />
                <label for="search-rsvp-input" class="visually-hidden">Buscar confirmación</label>
                <input
                  id="search-rsvp-input"
                  v-model="rsvpSearch"
                  type="search"
                  class="w-full rounded-xl border border-stone-300 py-2 pr-3 pl-9 text-xs sm:w-auto"
                />
              </div>
            </div>
          </div>

          <div
            tabindex="0"
            role="region"
            aria-labelledby="rsvp-table-caption"
            class="table-wrapper rounded-2xl border border-stone-200"
          >
            <table class="responsive-data-table text-left text-sm">
              <thead class="bg-stone-100 text-xs font-bold uppercase text-stone-600">
                <tr>
                  <th scope="col" class="px-4 py-3.5">Nombre que Confirma</th>
                  <th scope="col" class="px-4 py-3.5">Pase Dirigido A</th>
                  <th scope="col" class="px-4 py-3.5">Asistencia</th>
                  <th scope="col" class="px-4 py-3.5">Personas Confirmadas</th>
                  <th scope="col" class="px-4 py-3.5">Teléfono</th>
                  <th scope="col" class="px-4 py-3.5">Mensaje / Deseos</th>
                  <th scope="col" class="px-4 py-3.5">Fecha</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200">
                <tr
                  v-for="item in filteredRsvps"
                  :key="item.id"
                  class="hover:bg-stone-50/80"
                >
                  <th scope="row" class="px-4 py-3.5 font-bold text-stone-900">
                    {{ item.nombreConfirmado }}
                  </th>
                  <td data-label="Pase Dirigido A" class="px-4 py-3.5 text-stone-600">
                    {{ item.invitadoParam }}
                  </td>
                  <td data-label="Asistencia" class="px-4 py-3.5">
                    <span
                      v-if="item.asistira === 'si'"
                      class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
                    >
                      Sí asistirá
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800"
                    >
                      No asistirá
                    </span>
                  </td>
                  <td data-label="Personas Confirmadas" class="px-4 py-3.5 font-bold text-stone-900">
                    {{ item.cantidadPersonas }} / {{ item.pasesMaximos }} pases
                  </td>
                  <td data-label="Teléfono" class="px-4 py-3.5 text-stone-600">
                    {{ item.telefono || '—' }}
                  </td>
                  <td data-label="Mensaje" class="max-w-xs px-4 py-3.5 text-xs text-stone-600">
                    {{ item.mensaje || '—' }}
                  </td>
                  <td data-label="Fecha" class="px-4 py-3.5 text-xs text-stone-500">
                    {{ item.fechaRegistro }}
                  </td>
                </tr>
                <tr v-if="filteredRsvps.length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-sm text-stone-500">
                    No se encontraron confirmaciones con ese criterio.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- TAB 3: EVENTO (XV / BODA), PADRES (PLURAL/SINGULAR) Y TEXTOS      -->
      <!-- ================================================================= -->
      <section
        v-else-if="activeTab === 'evento'"
        key="panel-evento"
        aria-labelledby="tab-evento"
        class="grid gap-6 lg:grid-cols-2 lg:gap-8"
      >
        <!-- Tipo de Evento, Protagonistas y Padres -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-5 sm:p-6">
          <h2 class="text-base font-bold sm:text-lg">1. Tipo de Celebración y Protagonistas</h2>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              @click="switchEventType('xv')"
              class="flex items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-sm font-bold transition cursor-pointer"
              :class="
                config.tipoEvento === 'xv'
                  ? 'border-pink-600 bg-pink-50 text-pink-900'
                  : 'border-stone-200 bg-stone-50 text-stone-600'
              "
            >
              <CrownIcon class="h-5 w-5 shrink-0" />
              <span>Fiesta de Quinceaños</span>
            </button>

            <button
              type="button"
              @click="switchEventType('boda')"
              class="flex items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-sm font-bold transition cursor-pointer"
              :class="
                config.tipoEvento === 'boda'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-stone-50 text-stone-600'
              "
            >
              <HeartIcon class="h-5 w-5 shrink-0" />
              <span>Nuestra Boda</span>
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="cfg-titulo-portada" class="block text-xs font-bold text-stone-700">
                Título Superior de Portada
              </label>
              <input
                id="cfg-titulo-portada"
                v-model="config.tituloPortada"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label for="cfg-subtitulo-portada" class="block text-xs font-bold text-stone-700">
                Subtítulo de Portada
              </label>
              <input
                id="cfg-subtitulo-portada"
                v-model="config.subtituloPortada"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <!-- Si es Quinceaños -->
          <div v-if="config.tipoEvento === 'xv'">
            <label for="cfg-quinceanera" class="block text-xs font-bold text-stone-700">
              Nombre de la Quinceañera
            </label>
            <input
              id="cfg-quinceanera"
              v-model="config.nombreQuinceanera"
              type="text"
              class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-base font-bold"
            />
          </div>

          <!-- Si es Boda -->
          <div v-else class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="cfg-novia" class="block text-xs font-bold text-stone-700">
                Nombre de la Novia
              </label>
              <input
                id="cfg-novia"
                v-model="config.nombreNovia"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label for="cfg-novio" class="block text-xs font-bold text-stone-700">
                Nombre del Novio
              </label>
              <input
                id="cfg-novio"
                v-model="config.nombreNovio"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <!-- ============================================================= -->
          <!-- PADRES / ANFITRIONES (SOPORTE PLURAL, SINGULAR, FEM O MASC)   -->
          <!-- ============================================================= -->
          <div class="border-t border-stone-200 pt-5 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <input
                  id="chk-mostrar-padres"
                  v-model="config.mostrarPadres"
                  type="checkbox"
                  class="h-4 w-4 accent-pink-700"
                />
                <label for="chk-mostrar-padres" class="text-sm font-bold sm:text-base">
                  Mostrar Sección de Padres / Anfitriones
                </label>
              </div>
            </div>

            <div v-if="config.mostrarPadres" class="space-y-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div>
                  <label for="cfg-enc-padres" class="block text-xs font-bold text-stone-700">
                    Frase Superior de Bendición
                  </label>
                  <input
                    id="cfg-enc-padres"
                    v-model="config.encabezadoPadres"
                    type="text"
                    class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label for="cfg-titulo-padres" class="block text-xs font-bold text-stone-700">
                    Título de Sección (Ej: Mis Padres / Mi Madre / Mi Padre)
                  </label>
                  <input
                    id="cfg-titulo-padres"
                    v-model="config.tituloSeccionPadres"
                    type="text"
                    class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              <!-- Configuración de Padres en Quinceaños -->
              <div v-if="config.tipoEvento === 'xv'" class="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-4">
                <div>
                  <span class="block text-xs font-bold text-stone-700">
                    ¿Quiénes aparecen como padres en la invitación?
                  </span>
                  <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      @click="setXvParentMode('ambos')"
                      class="rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer"
                      :class="
                        config.padresQuinceanera.modalidad === 'ambos'
                          ? 'border-pink-600 bg-pink-50 text-pink-900'
                          : 'border-stone-300 bg-white text-stone-700'
                      "
                    >
                      Ambos Padres (Plural)
                    </button>
                    <button
                      type="button"
                      @click="setXvParentMode('madre')"
                      class="rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer"
                      :class="
                        config.padresQuinceanera.modalidad === 'madre'
                          ? 'border-pink-600 bg-pink-50 text-pink-900'
                          : 'border-stone-300 bg-white text-stone-700'
                      "
                    >
                      Solo Madre (Femenino)
                    </button>
                    <button
                      type="button"
                      @click="setXvParentMode('padre')"
                      class="rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer"
                      :class="
                        config.padresQuinceanera.modalidad === 'padre'
                          ? 'border-pink-600 bg-pink-50 text-pink-900'
                          : 'border-stone-300 bg-white text-stone-700'
                      "
                    >
                      Solo Padre (Masculino)
                    </button>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div
                    v-if="config.padresQuinceanera.modalidad === 'ambos' || config.padresQuinceanera.modalidad === 'padre'"
                  >
                    <label for="cfg-xv-padre" class="block text-xs font-bold text-stone-700">Nombre del Padre</label>
                    <input
                      id="cfg-xv-padre"
                      v-model="config.padresQuinceanera.padre"
                      type="text"
                      class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div
                    v-if="config.padresQuinceanera.modalidad === 'ambos' || config.padresQuinceanera.modalidad === 'madre'"
                  >
                    <label for="cfg-xv-madre" class="block text-xs font-bold text-stone-700">Nombre de la Madre</label>
                    <input
                      id="cfg-xv-madre"
                      v-model="config.padresQuinceanera.madre"
                      type="text"
                      class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <!-- Configuración de Padres en Boda -->
              <div v-else class="space-y-4">
                <!-- Padres de la Novia -->
                <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <input
                        id="chk-padres-novia"
                        v-model="config.padresNovia.mostrar"
                        type="checkbox"
                        class="h-4 w-4 accent-pink-700"
                      />
                      <label for="chk-padres-novia" class="text-xs font-bold uppercase text-stone-800">
                        Lado de la Novia
                      </label>
                    </div>

                    <div v-if="config.padresNovia.mostrar" class="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        @click="setWeddingParentMode('novia', 'ambos')"
                        class="rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        :class="config.padresNovia.modalidad === 'ambos' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-600'"
                      >
                        Padres (Ambos)
                      </button>
                      <button
                        type="button"
                        @click="setWeddingParentMode('novia', 'madre')"
                        class="rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        :class="config.padresNovia.modalidad === 'madre' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-600'"
                      >
                        Solo Madre
                      </button>
                      <button
                        type="button"
                        @click="setWeddingParentMode('novia', 'padre')"
                        class="rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        :class="config.padresNovia.modalidad === 'padre' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-600'"
                      >
                        Solo Padre
                      </button>
                    </div>
                  </div>

                  <div v-if="config.padresNovia.mostrar" class="space-y-3">
                    <div>
                      <label for="cfg-novia-titulo-card" class="block text-xs font-bold text-stone-700">
                        Título de Tarjeta (Ej: Padres de la Novia / Madre de la Novia / Padre de la Novia)
                      </label>
                      <input
                        id="cfg-novia-titulo-card"
                        v-model="config.padresNovia.titulo"
                        type="text"
                        class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div v-if="config.padresNovia.modalidad === 'ambos' || config.padresNovia.modalidad === 'padre'">
                        <label for="cfg-novia-padre" class="block text-xs font-bold text-stone-700">Padre de la Novia</label>
                        <input
                          id="cfg-novia-padre"
                          v-model="config.padresNovia.padre"
                          type="text"
                          class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div v-if="config.padresNovia.modalidad === 'ambos' || config.padresNovia.modalidad === 'madre'">
                        <label for="cfg-novia-madre" class="block text-xs font-bold text-stone-700">Madre de la Novia</label>
                        <input
                          id="cfg-novia-madre"
                          v-model="config.padresNovia.madre"
                          type="text"
                          class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Padres del Novio -->
                <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <input
                        id="chk-padres-novio"
                        v-model="config.padresNovio.mostrar"
                        type="checkbox"
                        class="h-4 w-4 accent-pink-700"
                      />
                      <label for="chk-padres-novio" class="text-xs font-bold uppercase text-stone-800">
                        Lado del Novio
                      </label>
                    </div>

                    <div v-if="config.padresNovio.mostrar" class="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        @click="setWeddingParentMode('novio', 'ambos')"
                        class="rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        :class="config.padresNovio.modalidad === 'ambos' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-600'"
                      >
                        Padres (Ambos)
                      </button>
                      <button
                        type="button"
                        @click="setWeddingParentMode('novio', 'madre')"
                        class="rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        :class="config.padresNovio.modalidad === 'madre' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-600'"
                      >
                        Solo Madre
                      </button>
                      <button
                        type="button"
                        @click="setWeddingParentMode('novio', 'padre')"
                        class="rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                        :class="config.padresNovio.modalidad === 'padre' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 bg-white text-stone-600'"
                      >
                        Solo Padre
                      </button>
                    </div>
                  </div>

                  <div v-if="config.padresNovio.mostrar" class="space-y-3">
                    <div>
                      <label for="cfg-novio-titulo-card" class="block text-xs font-bold text-stone-700">
                        Título de Tarjeta (Ej: Padres del Novio / Madre del Novio / Padre del Novio)
                      </label>
                      <input
                        id="cfg-novio-titulo-card"
                        v-model="config.padresNovio.titulo"
                        type="text"
                        class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold"
                      />
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div v-if="config.padresNovio.modalidad === 'ambos' || config.padresNovio.modalidad === 'padre'">
                        <label for="cfg-novio-padre" class="block text-xs font-bold text-stone-700">Padre del Novio</label>
                        <input
                          id="cfg-novio-padre"
                          v-model="config.padresNovio.padre"
                          type="text"
                          class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div v-if="config.padresNovio.modalidad === 'ambos' || config.padresNovio.modalidad === 'madre'">
                        <label for="cfg-novio-madre" class="block text-xs font-bold text-stone-700">Madre del Novio</label>
                        <input
                          id="cfg-novio-madre"
                          v-model="config.padresNovio.madre"
                          type="text"
                          class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Palabras Especiales o Texto Bíblico -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-5 sm:p-6">
          <h2 class="text-base font-bold sm:text-lg">2. Palabras Especiales o Texto Bíblico</h2>
          <p class="text-xs text-stone-500">
            Elige una plantilla tradicional salvadoreña o escribe tu propio mensaje emotivo o versículo bíblico.
          </p>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="applyQuotePreset('xv')"
              class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Plantilla XV: "Hoy es un día especial..."
            </button>
            <button
              type="button"
              @click="applyQuotePreset('boda')"
              class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Plantilla Boda: "Dos almas que han decidido..."
            </button>
            <button
              type="button"
              @click="applyQuotePreset('bib1')"
              class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Bíblico: 1 Corintios 13:4-7
            </button>
            <button
              type="button"
              @click="applyQuotePreset('bib2')"
              class="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Bíblico: Eclesiastés 3:1
            </button>
          </div>

          <div>
            <label for="cfg-mensaje-inicial" class="block text-xs font-bold text-stone-700">
              Texto de Bienvenida / Versículo
            </label>
            <textarea
              id="cfg-mensaje-inicial"
              v-model="config.mensajeInicial"
              rows="4"
              class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm leading-relaxed"
            ></textarea>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="cfg-tipo-msg" class="block text-xs font-bold text-stone-700">Estilo del Mensaje</label>
              <select
                id="cfg-tipo-msg"
                v-model="config.tipoMensajeInicial"
                class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
              >
                <option value="especial">Palabras Especiales</option>
                <option value="biblico">Cita Bíblica (Muestra referencia)</option>
              </select>
            </div>
            <div v-if="config.tipoMensajeInicial === 'biblico'">
              <label for="cfg-cita-autor" class="block text-xs font-bold text-stone-700">Cita Bíblica</label>
              <input
                id="cfg-cita-autor"
                v-model="config.citaBiblicaAutor"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- TAB 4: LUGARES, PADRINOS, VESTIMENTA (OPCIONAL) Y REGALO          -->
      <!-- ================================================================= -->
      <section
        v-else-if="activeTab === 'detalles'"
        key="panel-detalles"
        aria-labelledby="tab-detalles"
        class="space-y-6 sm:space-y-8"
      >
        <!-- Fecha, Misa y Recepción -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-6 sm:p-6">
          <h2 class="text-base font-bold sm:text-lg">1. Fecha, Misa y Recepción</h2>

          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label for="cfg-fecha-iso" class="block text-xs font-bold text-stone-700">
                Fecha y Hora (Contador Regresivo)
              </label>
              <input
                id="cfg-fecha-iso"
                v-model="config.fechaEventoISO"
                type="datetime-local"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label for="cfg-fecha-texto" class="block text-xs font-bold text-stone-700">
                Fecha en Texto (Ej: Sábado 19 de Diciembre de 2026)
              </label>
              <input
                id="cfg-fecha-texto"
                v-model="config.fechaTexto"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label for="cfg-mod-lugar" class="block text-xs font-bold text-stone-700">
                ¿Qué ubicaciones incluye el evento?
              </label>
              <select
                id="cfg-mod-lugar"
                v-model="config.modalidadLugar"
                class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold"
              >
                <option value="ambos">Misa / Ceremonia y Recepción (Ambos)</option>
                <option value="misa">Solo Ceremonia Religiosa / Misa</option>
                <option value="recepcion">Solo Recepción / Fiesta</option>
              </select>
            </div>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <!-- Datos Misa -->
            <div
              v-if="config.modalidadLugar === 'ambos' || config.modalidadLugar === 'misa'"
              class="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3 sm:p-5"
            >
              <h3 class="font-bold text-stone-900">Ceremonia Religiosa / Misa</h3>
              <div>
                <label for="misa-lugar" class="block text-xs font-bold text-stone-700">Nombre de la Iglesia / Templo</label>
                <input id="misa-lugar" v-model="config.misa.lugar" type="text" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="misa-hora" class="block text-xs font-bold text-stone-700">Hora</label>
                  <input id="misa-hora" v-model="config.misa.hora" type="text" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label for="misa-dir" class="block text-xs font-bold text-stone-700">Dirección / Municipio</label>
                  <input id="misa-dir" v-model="config.misa.direccion" type="text" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label for="misa-map" class="block text-xs font-bold text-stone-700">Enlace de Google Maps o Waze</label>
                <input id="misa-map" v-model="config.misa.mapaUrl" type="url" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
              </div>
            </div>

            <!-- Datos Recepción -->
            <div
              v-if="config.modalidadLugar === 'ambos' || config.modalidadLugar === 'recepcion'"
              class="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-3 sm:p-5"
            >
              <h3 class="font-bold text-stone-900">Recepción / Salón de Eventos</h3>
              <div>
                <label for="rec-lugar" class="block text-xs font-bold text-stone-700">Nombre del Salón / Hacienda / Hotel</label>
                <input id="rec-lugar" v-model="config.recepcion.lugar" type="text" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="rec-hora" class="block text-xs font-bold text-stone-700">Hora</label>
                  <input id="rec-hora" v-model="config.recepcion.hora" type="text" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
                </div>
                <div>
                  <label for="rec-dir" class="block text-xs font-bold text-stone-700">Dirección / Municipio</label>
                  <input id="rec-dir" v-model="config.recepcion.direccion" type="text" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label for="rec-map" class="block text-xs font-bold text-stone-700">Enlace de Google Maps o Waze</label>
                <input id="rec-map" v-model="config.recepcion.mapaUrl" type="url" class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- CÓDIGO DE VESTIMENTA (OPCIONAL Y CON OPCIONES RÁPIDAS)          -->
        <!-- =============================================================== -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <input
                id="chk-vestimenta"
                v-model="config.mostrarVestimenta"
                type="checkbox"
                class="h-4 w-4 accent-pink-700"
              />
              <label for="chk-vestimenta" class="flex items-center gap-2 text-base font-bold sm:text-lg">
                <ShirtIcon class="h-5 w-5 text-pink-700" />
                <span>2. Mostrar Código de Vestimenta (Opcional)</span>
              </label>
            </div>
            <span class="text-xs text-stone-500">
              {{ config.mostrarVestimenta ? 'Visible en la invitación' : 'Oculto en la invitación' }}
            </span>
          </div>

          <div v-if="config.mostrarVestimenta" class="space-y-4 border-t border-stone-100 pt-4">
            <div>
              <span class="block text-xs font-bold text-stone-700">
                Elige un estilo rápido o escribe uno personalizado abajo:
              </span>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="preset in DRESS_CODE_PRESETS"
                  :key="preset"
                  type="button"
                  @click="config.codigoVestimenta = preset; saveAllChanges()"
                  class="rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                  :class="
                    config.codigoVestimenta === preset
                      ? 'border-pink-600 bg-pink-50 font-bold text-pink-900'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  "
                >
                  {{ preset }}
                </button>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="cfg-cod-vestimenta" class="block text-xs font-bold text-stone-700">
                  Código de Vestimenta
                </label>
                <input
                  id="cfg-cod-vestimenta"
                  v-model="config.codigoVestimenta"
                  type="text"
                  class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold"
                />
              </div>
              <div>
                <label for="cfg-nota-vestimenta" class="block text-xs font-bold text-stone-700">
                  Nota o Colores Reservados (Opcional)
                </label>
                <input
                  id="cfg-nota-vestimenta"
                  v-model="config.notaVestimenta"
                  type="text"
                  class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- =============================================================== -->
        <!-- TIPO DE REGALO (INCLUYE OPCIÓN "SIN REGALO / SOLO PRESENCIA")   -->
        <!-- =============================================================== -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-5 sm:p-6">
          <div class="flex items-center gap-2">
            <GiftIcon class="h-5 w-5 text-pink-700" />
            <h2 class="text-base font-bold sm:text-lg">
              3. Modalidad de Regalo (Sobre, Tradicional o Sin Regalo)
            </h2>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              @click="config.tipoRegalo = 'sin_regalo'; saveAllChanges()"
              class="rounded-2xl border-2 p-3.5 text-left transition cursor-pointer"
              :class="
                config.tipoRegalo === 'sin_regalo'
                  ? 'border-pink-600 bg-pink-50/70'
                  : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
              "
            >
              <p class="text-xs font-bold text-stone-900">Sin Regalo (Solo Presencia)</p>
              <span class="mt-1 block text-[11px] text-stone-500">
                Agradecer únicamente la compañía con buenas palabras
              </span>
            </button>

            <button
              type="button"
              @click="config.tipoRegalo = 'sobre'; saveAllChanges()"
              class="rounded-2xl border-2 p-3.5 text-left transition cursor-pointer"
              :class="
                config.tipoRegalo === 'sobre'
                  ? 'border-pink-600 bg-pink-50/70'
                  : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
              "
            >
              <p class="text-xs font-bold text-stone-900">Solo Regalo de Sobre</p>
              <span class="mt-1 block text-[11px] text-stone-500">
                Lluvia de sobres en efectivo y/o cuenta bancaria
              </span>
            </button>

            <button
              type="button"
              @click="config.tipoRegalo = 'tradicional'; saveAllChanges()"
              class="rounded-2xl border-2 p-3.5 text-left transition cursor-pointer"
              :class="
                config.tipoRegalo === 'tradicional'
                  ? 'border-pink-600 bg-pink-50/70'
                  : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
              "
            >
              <p class="text-xs font-bold text-stone-900">Solo Regalo Tradicional</p>
              <span class="mt-1 block text-[11px] text-stone-500">
                Mesa de regalos (Siman, Amazon, etc.) o regalo físico
              </span>
            </button>

            <button
              type="button"
              @click="config.tipoRegalo = 'ambos'; saveAllChanges()"
              class="rounded-2xl border-2 p-3.5 text-left transition cursor-pointer"
              :class="
                config.tipoRegalo === 'ambos'
                  ? 'border-pink-600 bg-pink-50/70'
                  : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
              "
            >
              <p class="text-xs font-bold text-stone-900">Ambos (Sobre + Tradicional)</p>
              <span class="mt-1 block text-[11px] text-stone-500">
                Muestra tanto lluvia de sobres como mesa de regalos
              </span>
            </button>
          </div>

          <!-- Configuración si eligió "Sin Regalo (Solo agradecer presencia)" -->
          <div
            v-if="config.tipoRegalo === 'sin_regalo'"
            class="rounded-2xl border border-pink-200 bg-pink-50/40 p-4 space-y-4 sm:p-5"
          >
            <div>
              <span class="block text-xs font-bold text-stone-700">
                Plantillas de agradecimiento por presencia (haz clic para usar):
              </span>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="(tpl, idx) in NO_GIFT_TEMPLATES"
                  :key="idx"
                  type="button"
                  @click="config.infoSinRegalo.descripcion = tpl; saveAllChanges()"
                  class="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Opción de palabras #{{ idx + 1 }}
                </button>
              </div>
            </div>

            <div>
              <label for="cfg-sin-regalo-titulo" class="block text-xs font-bold text-stone-700">
                Título del Mensaje
              </label>
              <input
                id="cfg-sin-regalo-titulo"
                v-model="config.infoSinRegalo.titulo"
                type="text"
                class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label for="cfg-sin-regalo-desc" class="block text-xs font-bold text-stone-700">
                Palabras de Agradecimiento por su Presencia
              </label>
              <textarea
                id="cfg-sin-regalo-desc"
                v-model="config.infoSinRegalo.descripcion"
                rows="3"
                class="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
              ></textarea>
            </div>
          </div>

          <!-- Configuración si eligió Sobre, Tradicional o Ambos -->
          <div v-else class="space-y-4 border-t border-stone-100 pt-4">
            <div
              v-if="config.tipoRegalo === 'sobre' || config.tipoRegalo === 'ambos'"
              class="grid gap-4 sm:grid-cols-3"
            >
              <div>
                <label for="cfg-banco" class="block text-xs font-bold text-stone-700">
                  Banco (Para Transferencia Opcional)
                </label>
                <input id="cfg-banco" v-model="config.infoSobre.banco" type="text" class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label for="cfg-cuenta" class="block text-xs font-bold text-stone-700">
                  Número de Cuenta
                </label>
                <input id="cfg-cuenta" v-model="config.infoSobre.numeroCuenta" type="text" class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label for="cfg-titular" class="block text-xs font-bold text-stone-700">
                  Nombre del Titular
                </label>
                <input id="cfg-titular" v-model="config.infoSobre.titular" type="text" class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
            </div>

            <div
              v-if="config.tipoRegalo === 'tradicional' || config.tipoRegalo === 'ambos'"
              class="grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label for="cfg-tienda1" class="block text-xs font-bold text-stone-700">
                  Tienda / Mesa de Regalos 1 (Ej: Almacenes Siman)
                </label>
                <input id="cfg-tienda1" v-model="config.infoTradicional.tienda1Nombre" type="text" class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label for="cfg-tienda1-url" class="block text-xs font-bold text-stone-700">
                  Link de Mesa de Regalos 1
                </label>
                <input id="cfg-tienda1-url" v-model="config.infoTradicional.tienda1Url" type="url" class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <!-- Padrinos y Corte de Honor -->
        <div class="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <!-- Padrinos -->
          <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <input id="chk-padrinos" v-model="config.mostrarPadrinos" type="checkbox" class="h-4 w-4 accent-pink-700" />
                <label for="chk-padrinos" class="text-sm font-bold sm:text-base">Mostrar Sección de Padrinos</label>
              </div>
              <button
                type="button"
                @click="addPadrino"
                class="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                <PlusIcon class="h-3.5 w-3.5" />
                <span>Agregar Padrino</span>
              </button>
            </div>

            <div v-if="config.mostrarPadrinos" class="space-y-3">
              <div
                v-for="(pad, idx) in config.padrinos"
                :key="pad.id"
                class="flex items-start gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3"
              >
                <div class="grid flex-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label :for="`pad-rol-${idx}`" class="visually-hidden">Rol del Padrino</label>
                    <input
                      :id="`pad-rol-${idx}`"
                      v-model="pad.rol"
                      type="text"
                      class="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label :for="`pad-nom-${idx}`" class="visually-hidden">Nombres de los Padrinos</label>
                    <input
                      :id="`pad-nom-${idx}`"
                      v-model="pad.nombres"
                      type="text"
                      class="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  @click="removePadrino(idx)"
                  class="rounded-lg p-1.5 text-red-600 hover:bg-red-50 cursor-pointer"
                  aria-label="Eliminar padrino"
                >
                  <Trash2Icon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Corte de Honor -->
          <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <input id="chk-corte" v-model="config.mostrarCorteHonor" type="checkbox" class="h-4 w-4 accent-pink-700" />
                <label for="chk-corte" class="text-sm font-bold sm:text-base">Mostrar Corte de Honor</label>
              </div>
              <button
                type="button"
                @click="addCorteMember"
                class="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                <PlusIcon class="h-3.5 w-3.5" />
                <span>Agregar Integrante</span>
              </button>
            </div>

            <div v-if="config.mostrarCorteHonor" class="space-y-3">
              <div
                v-for="(corte, idx) in config.corteHonor"
                :key="corte.id"
                class="flex items-start gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3"
              >
                <div class="grid flex-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label :for="`cor-rol-${idx}`" class="visually-hidden">Rol en la Corte</label>
                    <input
                      :id="`cor-rol-${idx}`"
                      v-model="corte.rol"
                      type="text"
                      class="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label :for="`cor-nom-${idx}`" class="visually-hidden">Nombre del integrante</label>
                    <input
                      :id="`cor-nom-${idx}`"
                      v-model="corte.nombre"
                      type="text"
                      class="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeCorteMember(idx)"
                  class="rounded-lg p-1.5 text-red-600 hover:bg-red-50 cursor-pointer"
                  aria-label="Eliminar integrante"
                >
                  <Trash2Icon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- TAB 5: COLORES E IMÁGENES DESDE GOOGLE DRIVE                      -->
      <!-- ================================================================= -->
      <section
        v-else-if="activeTab === 'diseno'"
        key="panel-diseno"
        aria-labelledby="tab-diseno"
        class="grid gap-6 lg:grid-cols-2 lg:gap-8"
      >
        <!-- Paletas y Colores -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-6 sm:p-6">
          <div>
            <h2 class="text-base font-bold sm:text-lg">Paletas de Colores</h2>
            <p class="text-xs text-stone-500">Elige una combinación elegante o personaliza cada color a tu gusto.</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              type="button"
              @click="applyThemePreset(preset.id)"
              class="flex items-center justify-between rounded-2xl border border-stone-200 p-3.5 text-left transition hover:border-stone-400 cursor-pointer"
            >
              <div>
                <p class="text-xs font-bold text-stone-900">{{ preset.nombre }}</p>
                <span class="text-[11px] text-stone-500">{{ preset.badge }}</span>
              </div>
              <div class="flex -space-x-1 shrink-0">
                <span class="h-6 w-6 rounded-full border border-white shadow-xs" :style="{ backgroundColor: preset.colores.primario }"></span>
                <span class="h-6 w-6 rounded-full border border-white shadow-xs" :style="{ backgroundColor: preset.colores.secundario }"></span>
                <span class="h-6 w-6 rounded-full border border-stone-200 shadow-xs" :style="{ backgroundColor: preset.colores.fondo }"></span>
              </div>
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 border-t border-stone-100 pt-5 sm:grid-cols-3">
            <div>
              <label for="col-primario" class="block text-xs font-bold text-stone-700">Color Primario</label>
              <div class="mt-1 flex items-center gap-2">
                <input id="col-primario" v-model="config.colores.primario" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-stone-300" />
                <span class="font-mono text-xs">{{ config.colores.primario }}</span>
              </div>
            </div>
            <div>
              <label for="col-secundario" class="block text-xs font-bold text-stone-700">Dorado / Acento</label>
              <div class="mt-1 flex items-center gap-2">
                <input id="col-secundario" v-model="config.colores.secundario" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-stone-300" />
                <span class="font-mono text-xs">{{ config.colores.secundario }}</span>
              </div>
            </div>
            <div>
              <label for="col-fondo" class="block text-xs font-bold text-stone-700">Fondo de Página</label>
              <div class="mt-1 flex items-center gap-2">
                <input id="col-fondo" v-model="config.colores.fondo" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-stone-300" />
                <span class="font-mono text-xs">{{ config.colores.fondo }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Imágenes (Soporte automático para Google Drive) -->
        <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-5 sm:p-6">
          <div>
            <h2 class="text-base font-bold sm:text-lg">Imágenes desde Google Drive o Enlaces</h2>
            <p class="text-xs text-stone-500">
              Pega directamente enlaces compartidos de Google Drive (<code>https://drive.google.com/file/d/.../view?usp=sharing</code>); el sistema los transforma automáticamente.
            </p>
          </div>

          <div>
            <label for="img-hero" class="block text-xs font-bold text-stone-700">
              Link de Imagen de Portada (Hero)
            </label>
            <input
              id="img-hero"
              v-model="config.imagenes.heroUrl"
              type="url"
              class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs"
            />
            <div class="mt-3 h-40 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
              <img :src="resolveImageUrl(config.imagenes.heroUrl)" alt="Vista previa portada" class="h-full w-full object-cover" />
            </div>
          </div>

          <div class="border-t border-stone-100 pt-4">
            <label for="new-gallery-img" class="block text-xs font-bold text-stone-700">
              Agregar Foto a la Galería (Link de Drive o web)
            </label>
            <div class="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                id="new-gallery-img"
                v-model="newGalleryUrl"
                type="url"
                class="flex-1 rounded-xl border border-stone-300 px-3.5 py-2 text-xs"
              />
              <button
                type="button"
                @click="addGalleryImage"
                class="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                Agregar Foto
              </button>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div
                v-for="(gUrl, idx) in config.imagenes.galeriaUrls"
                :key="idx"
                class="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
              >
                <img :src="resolveImageUrl(gUrl)" alt="Foto galería" class="h-full w-full object-cover" />
                <button
                  type="button"
                  @click="removeGalleryImage(idx)"
                  class="absolute top-1.5 right-1.5 rounded-lg bg-red-600 p-1.5 text-white shadow-md cursor-pointer"
                  aria-label="Quitar imagen"
                >
                  <Trash2Icon class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================================================= -->
      <!-- TAB 6: CONEXIÓN CON GOOGLE SHEETS (PASO A PASO + SCRIPT)          -->
      <!-- ================================================================= -->
      <section
        v-else-if="activeTab === 'sheets'"
        key="panel-sheets"
        aria-labelledby="tab-sheets"
        class="grid gap-6 lg:grid-cols-12 lg:gap-8"
      >
        <div class="lg:col-span-5 space-y-6">
          <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4 sm:p-6">
            <div class="flex items-center gap-2.5">
              <DatabaseIcon class="h-5 w-5 shrink-0 text-emerald-600" />
              <h2 class="text-base font-bold sm:text-lg">URL de tu Google Sheets (Web App)</h2>
            </div>
            <p class="text-xs text-stone-600 leading-relaxed">
              Pega aquí la URL generada al publicar tu script en Google Sheets. Con esto las respuestas de tus invitados se guardarán en tu hoja de cálculo y podrás consultarlas desde la pestaña <strong>2. Respuestas</strong>.
            </p>

            <div>
              <label for="cfg-script-url" class="block text-xs font-bold text-stone-700">
                URL de Implementación de Google Apps Script
              </label>
              <input
                id="cfg-script-url"
                v-model="config.googleScriptUrl"
                type="url"
                aria-describedby="script-url-help"
                class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 font-mono text-xs"
              />
              <span id="script-url-help" class="mt-1 block text-xs text-stone-500">
                Formato: https://script.google.com/macros/s/.../exec
              </span>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="cfg-whatsapp" class="block text-xs font-bold text-stone-700">
                  Tu WhatsApp para Recibir Avisos
                </label>
                <input
                  id="cfg-whatsapp"
                  v-model="config.whatsappConfirmacion"
                  type="tel"
                  class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label for="cfg-fecha-limite" class="block text-xs font-bold text-stone-700">
                  Fecha Límite de Confirmación
                </label>
                <input
                  id="cfg-fecha-limite"
                  v-model="config.fechaLimiteConfirmacion"
                  type="text"
                  class="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              :disabled="isSyncingSheets"
              @click="saveAndSyncCloud"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
            >
              <SaveIcon class="h-4 w-4 shrink-0" />
              <span>Guardar y Sincronizar con Google Sheets</span>
            </button>
          </div>

          <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 text-xs text-stone-700 sm:p-6">
            <h3 class="text-sm font-bold text-stone-900">¿Cómo conectarlo en 3 minutos?</h3>
            <ol class="list-decimal pl-4 space-y-2 leading-relaxed">
              <li>Crea una hoja en blanco en <strong>Google Sheets</strong>.</li>
              <li>En el menú superior haz clic en <strong>Extensiones &rarr; Apps Script</strong>.</li>
              <li>Borra el contenido que aparece y pega el código de la derecha.</li>
              <li>Haz clic en <strong>Implementar &rarr; Nueva implementación</strong>, elige tipo <strong>Aplicación web</strong> y en <em>"Quién tiene acceso"</em> selecciona <strong>Cualquier persona (Anyone)</strong>.</li>
              <li>Copia la URL que termina en <code>/exec</code> y pégala arriba. ¡Listo!</li>
            </ol>
          </div>
        </div>

        <div class="lg:col-span-7 min-w-0">
          <div class="rounded-3xl border border-stone-200 bg-stone-900 p-4 text-stone-100 shadow-xs sm:p-6">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-bold text-white">Código para Google Apps Script</h3>
                <p class="text-xs text-stone-400">Crea automáticamente las pestañas "Confirmaciones" y "Configuracion"</p>
              </div>
              <button
                type="button"
                @click="copyAppsScriptCode"
                class="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/25 cursor-pointer"
              >
                <CheckIcon v-if="copiedScript" class="h-4 w-4 shrink-0 text-emerald-400" />
                <CopyIcon v-else class="h-4 w-4 shrink-0" />
                <span>{{ copiedScript ? '¡Código Copiado!' : 'Copiar Código' }}</span>
              </button>
            </div>
            <pre class="max-h-[420px] overflow-auto rounded-2xl bg-black/50 p-3.5 text-[11px] leading-relaxed text-emerald-300 sm:p-4 sm:text-xs"><code>{{ GOOGLE_APPS_SCRIPT_CODE }}</code></pre>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
