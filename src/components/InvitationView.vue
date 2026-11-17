<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import {
  Crown,
  Heart,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Users,
  Gift,
  Mail,
  CheckCircle2,
  Send,
  Settings,
  Church,
  PartyPopper,
  Shirt,
  Copy,
  Check,
  ExternalLink,
  Award,
  Star,
  Ticket,
  MessageCircle,
  BookOpen,
} from 'lucide-vue-next';
import {
  type InvitationConfig,
  DEFAULT_CONFIG,
  loadLocalConfig,
  saveLocalConfig,
  fetchConfigFromGoogleSheets,
  submitRsvpToGoogleSheets,
  resolveImageUrl,
} from '../utils/invitationStore';

const config = ref<InvitationConfig>(structuredClone(DEFAULT_CONFIG));
const isLoadingCloud = ref(false);

// Datos personalizados leídos por parámetros de la URL (?invitado=...&pases=...&mesa=...)
const guestParamName = ref('Familia e Invitados Especiales');
const guestMaxPasses = ref(2);
const guestTable = ref('');
const showAdminButton = ref(false);

// Countdown state
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 });
let timerInterval: ReturnType<typeof setInterval> | null = null;

// Estado del formulario de Confirmación (RSVP)
const rsvpForm = ref({
  nombreConfirmado: '',
  asistira: 'si' as 'si' | 'no',
  cantidadPersonas: 2,
  telefono: '',
  restriccionAlimentaria: '',
  mensaje: '',
});
const fieldTouched = ref<{ nombreConfirmado: boolean; telefono: boolean }>({
  nombreConfirmado: false,
  telefono: false,
});
const formError = ref('');
const isSubmitting = ref(false);
const rsvpSubmitted = ref(false);
const rsvpSyncedCloud = ref(false);
const copiedBank = ref(false);

const nombreInputRef = ref<HTMLInputElement | null>(null);

const cssVars = computed(() => ({
  '--color-primary': config.value.colores.primario,
  '--color-secondary': config.value.colores.secundario,
  '--color-bg': config.value.colores.fondo,
  '--color-surface': config.value.colores.superficie,
  '--color-text': config.value.colores.texto,
}));

const heroImageResolved = computed(() => resolveImageUrl(config.value.imagenes.heroUrl));
const galleryResolved = computed(() =>
  (config.value.imagenes.galeriaUrls || []).filter(Boolean).map((u) => resolveImageUrl(u))
);

const passOptions = computed(() => {
  const max = Math.max(1, Math.min(25, guestMaxPasses.value || 1));
  return Array.from({ length: max }, (_, idx) => idx + 1);
});

const protagonistTitle = computed(() => {
  if (config.value.tipoEvento === 'xv') {
    return config.value.nombreQuinceanera || 'Sofía Valentina';
  }
  return `${config.value.nombreNovia || 'María Fernanda'} & ${config.value.nombreNovio || 'José Alejandro'}`;
});

// Cómputo de nombres de padres para XV Años (Plural, Singular Femenino o Singular Masculino)
const xvParentsList = computed(() => {
  const p = config.value.padresQuinceanera;
  if (!p) return [];
  if (p.modalidad === 'madre') {
    return [p.madre].filter((v) => v && v.trim());
  }
  if (p.modalidad === 'padre') {
    return [p.padre].filter((v) => v && v.trim());
  }
  return [p.padre, p.madre].filter((v) => v && v.trim());
});

// Cómputo de nombres de padres para Boda (Novia y Novio por separado)
const brideParentsList = computed(() => {
  const p = config.value.padresNovia;
  if (!p || p.mostrar === false) return [];
  if (p.modalidad === 'madre') return [p.madre].filter((v) => v && v.trim());
  if (p.modalidad === 'padre') return [p.padre].filter((v) => v && v.trim());
  return [p.padre, p.madre].filter((v) => v && v.trim());
});

const groomParentsList = computed(() => {
  const p = config.value.padresNovio;
  if (!p || p.mostrar === false) return [];
  if (p.modalidad === 'madre') return [p.madre].filter((v) => v && v.trim());
  if (p.modalidad === 'padre') return [p.padre].filter((v) => v && v.trim());
  return [p.padre, p.madre].filter((v) => v && v.trim());
});

const visibleWeddingParentCards = computed(() => {
  let count = 0;
  if (config.value.padresNovia?.mostrar !== false && brideParentsList.value.length > 0) count++;
  if (config.value.padresNovio?.mostrar !== false && groomParentsList.value.length > 0) count++;
  return count;
});

function updateCountdown() {
  const target = new Date(config.value.fechaEventoISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);

  countdown.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function readUrlParameters() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);

  const invitado =
    params.get('invitado') ||
    params.get('para') ||
    params.get('nombre') ||
    params.get('familia');

  const pasesRaw =
    params.get('pases') ||
    params.get('cupos') ||
    params.get('personas') ||
    params.get('boletos');

  const mesa = params.get('mesa') || '';

  // Si la URL lleva parámetros de invitado/pases (o cualquier query param), ocultamos el botón de Panel Admin
  const hasRouteParams =
    Boolean(invitado && invitado.trim()) ||
    Boolean(pasesRaw && pasesRaw.trim()) ||
    Boolean(mesa && mesa.trim()) ||
    window.location.search.length > 1;

  showAdminButton.value = !hasRouteParams;

  if (invitado && invitado.trim()) {
    guestParamName.value = invitado.trim();
    rsvpForm.value.nombreConfirmado = invitado.trim();
  }

  if (pasesRaw) {
    const parsed = parseInt(pasesRaw, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 25) {
      guestMaxPasses.value = parsed;
      rsvpForm.value.cantidadPersonas = parsed;
    }
  }

  if (mesa.trim()) {
    guestTable.value = mesa.trim();
  }
}

async function copyAccountNumber() {
  if (!config.value.infoSobre.numeroCuenta) return;
  try {
    await navigator.clipboard.writeText(config.value.infoSobre.numeroCuenta);
    copiedBank.value = true;
    setTimeout(() => {
      copiedBank.value = false;
    }, 2500);
  } catch {
    // ignore
  }
}

const isNameInvalid = computed(() => {
  return fieldTouched.value.nombreConfirmado && rsvpForm.value.nombreConfirmado.trim().length < 2;
});

async function handleRsvpSubmit() {
  fieldTouched.value.nombreConfirmado = true;
  formError.value = '';

  if (rsvpForm.value.nombreConfirmado.trim().length < 2) {
    formError.value = 'Por favor escribe tu nombre completo o el de tu familia para confirmar.';
    nombreInputRef.value?.focus();
    return;
  }

  isSubmitting.value = true;

  const finalPasses =
    rsvpForm.value.asistira === 'si'
      ? Math.min(rsvpForm.value.cantidadPersonas, guestMaxPasses.value)
      : 0;

  const newRsvp = {
    id: `rsvp_${Date.now()}`,
    fechaRegistro: new Date().toLocaleString('es-SV'),
    invitadoParam: guestParamName.value,
    nombreConfirmado: rsvpForm.value.nombreConfirmado.trim(),
    asistira: rsvpForm.value.asistira,
    cantidadPersonas: finalPasses,
    pasesMaximos: guestMaxPasses.value,
    telefono: rsvpForm.value.telefono.trim(),
    mensaje: rsvpForm.value.mensaje.trim(),
    restriccionAlimentaria: rsvpForm.value.restriccionAlimentaria.trim(),
  };

  const result = await submitRsvpToGoogleSheets(config.value.googleScriptUrl, newRsvp);
  isSubmitting.value = false;
  rsvpSubmitted.value = true;
  rsvpSyncedCloud.value = result.synced;

  if (rsvpForm.value.asistira === 'si') {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.65 },
    });
  }
}

const whatsappDirectUrl = computed(() => {
  const phone = (config.value.whatsappConfirmacion || '').replace(/\D/g, '');
  const eventLabel =
    config.value.tipoEvento === 'xv'
      ? `los XV años de ${config.value.nombreQuinceanera}`
      : `la boda de ${config.value.nombreNovia} y ${config.value.nombreNovio}`;

  const statusText =
    rsvpForm.value.asistira === 'si'
      ? `¡Hola! Confirmo con mucha alegría nuestra asistencia a ${eventLabel}. Asistiremos ${rsvpForm.value.cantidadPersonas} de ${guestMaxPasses.value} pases (${rsvpForm.value.nombreConfirmado || guestParamName.value}).`
      : `Hola, muchas gracias por la invitación a ${eventLabel}, lamentablemente no podremos asistir (${rsvpForm.value.nombreConfirmado || guestParamName.value}). ¡Les deseamos lo mejor!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(statusText)}`;
});

onMounted(async () => {
  config.value = loadLocalConfig();
  readUrlParameters();
  updateCountdown();
  timerInterval = setInterval(updateCountdown, 1000);

  const params = new URLSearchParams(window.location.search);
  const apiParam = params.get('api');
  const targetScriptUrl = apiParam || config.value.googleScriptUrl;

  if (targetScriptUrl) {
    isLoadingCloud.value = true;
    const remoteConfig = await fetchConfigFromGoogleSheets(targetScriptUrl);
    if (remoteConfig) {
      config.value = {
        ...remoteConfig,
        googleScriptUrl: targetScriptUrl,
      };
      saveLocalConfig(config.value);
      updateCountdown();
    }
    isLoadingCloud.value = false;
  }
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div
    :style="cssVars"
    class="min-h-dvh transition-colors duration-500"
    style="background-color: var(--color-bg); color: var(--color-text)"
  >
    <!-- Botón flotante para ir al Panel de Administrador (Solo visible si NO hay parámetros en la ruta) -->
    <div v-if="showAdminButton" class="fixed top-3 right-3 z-50 sm:top-4 sm:right-4">
      <a
        href="/admin"
        class="inline-flex items-center gap-2 rounded-full bg-stone-900/85 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-stone-900 sm:px-4 sm:py-2.5"
        title="Abrir Panel de Administración"
      >
        <Settings class="h-4 w-4 text-amber-300 shrink-0" />
        <span>Panel Admin</span>
      </a>
    </div>

    <!-- =================================================================== -->
    <!-- 1. PORTADA / HERO PRINCIPAL (100% RESPONSIVE)                       -->
    <!-- =================================================================== -->
    <header class="relative flex min-h-[90dvh] items-center justify-center overflow-hidden px-4 py-16 text-center text-white sm:px-6 sm:py-24">
      <!-- Imagen de fondo (Soporta links directos y de Google Drive) -->
      <div class="absolute inset-0 z-0">
        <img
          :src="heroImageResolved"
          :alt="protagonistTitle"
          class="h-full w-full object-cover object-center transition-transform duration-1000 scale-105"
        />
        <div
          class="absolute inset-0"
          style="background: linear-gradient(to bottom, rgba(15, 10, 15, 0.55), rgba(15, 10, 15, 0.75))"
        ></div>
      </div>

      <!-- Contenido de Portada -->
      <div class="relative z-10 mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
        <div
          class="mx-auto inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase backdrop-blur-md sm:px-5 sm:py-2 sm:text-xs"
        >
          <Crown v-if="config.tipoEvento === 'xv'" class="h-4 w-4 text-amber-300 shrink-0" />
          <Heart v-else class="h-4 w-4 text-amber-300 shrink-0" />
          <span>{{ config.tituloPortada }}</span>
          <Sparkles class="h-4 w-4 text-amber-300 shrink-0" />
        </div>

        <h1 class="font-script-elegant hero-title-fluid leading-tight drop-shadow-md px-2">
          {{ protagonistTitle }}
        </h1>

        <p class="font-serif-elegant mx-auto max-w-xl px-2 text-lg italic text-white/90 sm:text-2xl">
          {{ config.subtituloPortada }}
        </p>

        <!-- Ornamento divisor -->
        <div class="flex items-center justify-center gap-3 py-1 sm:gap-4">
          <span class="h-px w-12 bg-amber-300/70 sm:w-16"></span>
          <Sparkles class="h-5 w-5 text-amber-300 shrink-0" />
          <span class="h-px w-12 bg-amber-300/70 sm:w-16"></span>
        </div>

        <div class="inline-flex items-center gap-2 rounded-2xl bg-black/40 px-4 py-2.5 text-sm font-medium tracking-wide backdrop-blur-sm sm:px-6 sm:py-3 sm:text-lg">
          <Calendar class="h-4 w-4 text-amber-300 shrink-0 sm:h-5 sm:w-5" />
          <span>{{ config.fechaTexto }}</span>
        </div>

        <!-- Tarjeta de Pase Personalizado en Hero -->
        <div class="pt-3 sm:pt-4">
          <div
            class="mx-auto max-w-md rounded-2xl border border-amber-300/40 bg-white/95 p-4 text-stone-800 shadow-2xl backdrop-blur-md sm:p-5"
          >
            <div class="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-widest uppercase sm:text-xs" style="color: var(--color-primary)">
              <Ticket class="h-4 w-4 shrink-0" />
              <span>Pase de Invitación Personal</span>
            </div>
            <p class="font-serif-elegant mt-1.5 text-xl font-bold text-stone-900 sm:text-3xl">
              {{ guestParamName }}
            </p>
            <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-sm"
                style="background-color: var(--color-primary)"
              >
                <Users class="h-3.5 w-3.5 shrink-0" />
                <span>Válido para {{ guestMaxPasses }} {{ guestMaxPasses === 1 ? 'persona' : 'personas' }}</span>
              </span>
              <span
                v-if="guestTable"
                class="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700"
              >
                {{ guestTable }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- =================================================================== -->
    <!-- 2. CUENTA REGRESIVA (RESPONSIVE 2x2 EN MÓVIL PEQUEÑO, 4 EN SM)      -->
    <!-- =================================================================== -->
    <section class="relative z-20 -mt-8 px-4 sm:-mt-10 sm:px-6">
      <div
        class="mx-auto max-w-3xl rounded-3xl border border-stone-200/80 p-5 shadow-xl sm:p-8"
        style="background-color: var(--color-surface)"
      >
        <p class="text-center text-xs font-bold tracking-[0.18em] uppercase text-stone-500">
          Faltan pocos días para celebrar juntos
        </p>
        <div class="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4 sm:gap-5">
          <div class="rounded-2xl bg-stone-50 p-3 sm:p-4">
            <span class="font-serif-elegant block text-3xl font-bold sm:text-5xl" style="color: var(--color-primary)">
              {{ countdown.days }}
            </span>
            <span class="mt-1 block text-xs font-semibold tracking-wider uppercase text-stone-500">Días</span>
          </div>
          <div class="rounded-2xl bg-stone-50 p-3 sm:p-4">
            <span class="font-serif-elegant block text-3xl font-bold sm:text-5xl" style="color: var(--color-primary)">
              {{ countdown.hours }}
            </span>
            <span class="mt-1 block text-xs font-semibold tracking-wider uppercase text-stone-500">Horas</span>
          </div>
          <div class="rounded-2xl bg-stone-50 p-3 sm:p-4">
            <span class="font-serif-elegant block text-3xl font-bold sm:text-5xl" style="color: var(--color-primary)">
              {{ countdown.minutes }}
            </span>
            <span class="mt-1 block text-xs font-semibold tracking-wider uppercase text-stone-500">Minutos</span>
          </div>
          <div class="rounded-2xl bg-stone-50 p-3 sm:p-4">
            <span class="font-serif-elegant block text-3xl font-bold sm:text-5xl" style="color: var(--color-primary)">
              {{ countdown.seconds }}
            </span>
            <span class="mt-1 block text-xs font-semibold tracking-wider uppercase text-stone-500">Segundos</span>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 3. PALABRAS ESPECIALES O TEXTO BÍBLICO                              -->
    <!-- =================================================================== -->
    <section class="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
      <div
        class="relative rounded-3xl border p-6 shadow-sm sm:p-12"
        style="background-color: var(--color-surface); border-color: color-mix(in srgb, var(--color-secondary) 45%, transparent)"
      >
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full sm:mb-5"
          style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary)"
        >
          <BookOpen v-if="config.tipoMensajeInicial === 'biblico'" class="h-6 w-6" />
          <Sparkles v-else class="h-6 w-6" />
        </div>

        <blockquote class="font-serif-elegant text-xl leading-relaxed italic sm:text-3xl">
          “{{ config.mensajeInicial }}”
        </blockquote>

        <p
          v-if="config.tipoMensajeInicial === 'biblico' && config.citaBiblicaAutor"
          class="mt-4 text-xs font-bold tracking-widest uppercase sm:text-sm"
          style="color: var(--color-primary)"
        >
          — {{ config.citaBiblicaAutor }}
        </p>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 4. PADRES Y ANFITRIONES (SOPORTA PLURAL, SINGULAR, FEM O MASC)      -->
    <!-- =================================================================== -->
    <section
      v-if="config.mostrarPadres !== false"
      class="mx-auto max-w-4xl px-4 pb-12 text-center sm:px-6 sm:pb-16"
    >
      <p class="text-xs font-bold tracking-[0.2em] uppercase" style="color: var(--color-secondary)">
        {{ config.encabezadoPadres }}
      </p>
      <h2 class="font-serif-elegant section-title-fluid mt-1.5 font-bold">
        {{ config.tituloSeccionPadres || (config.tipoEvento === 'xv' ? 'Mis Padres' : 'Nuestros Padres') }}
      </h2>

      <!-- Caso Quinceaños: 1 o 2 padres (Padre, Madre o Ambos) -->
      <div
        v-if="config.tipoEvento === 'xv' && xvParentsList.length > 0"
        class="mx-auto mt-6 max-w-xl rounded-3xl border border-stone-200/80 p-6 shadow-sm sm:mt-8 sm:p-8"
        style="background-color: var(--color-surface)"
      >
        <template v-for="(parentName, idx) in xvParentsList" :key="idx">
          <span
            v-if="idx > 0"
            class="my-2 block font-script-elegant text-2xl"
            style="color: var(--color-secondary)"
          >
            &amp;
          </span>
          <p class="font-serif-elegant text-2xl font-semibold sm:text-3xl">
            {{ parentName }}
          </p>
        </template>

        <p v-if="config.quienesInvitanExtra" class="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-600">
          {{ config.quienesInvitanExtra }}
        </p>
      </div>

      <!-- Caso Boda: Padres de la Novia y/o Padres del Novio (Plural o Singular cada lado) -->
      <div
        v-else-if="config.tipoEvento === 'boda' && visibleWeddingParentCards > 0"
        class="mt-6 grid gap-5 sm:mt-8"
        :class="visibleWeddingParentCards === 2 ? 'sm:grid-cols-2' : 'mx-auto max-w-xl'"
      >
        <!-- Lado de la Novia -->
        <div
          v-if="config.padresNovia?.mostrar !== false && brideParentsList.length > 0"
          class="rounded-3xl border border-stone-200/80 p-6 shadow-sm sm:p-7"
          style="background-color: var(--color-surface)"
        >
          <span class="text-xs font-bold tracking-widest uppercase" style="color: var(--color-primary)">
            {{ config.padresNovia.titulo || 'Padres de la Novia' }}
          </span>
          <div class="mt-3">
            <template v-for="(pName, idx) in brideParentsList" :key="idx">
              <span
                v-if="idx > 0"
                class="my-1 block font-script-elegant text-xl"
                style="color: var(--color-secondary)"
              >
                &amp;
              </span>
              <p class="font-serif-elegant text-2xl font-semibold">
                {{ pName }}
              </p>
            </template>
          </div>
        </div>

        <!-- Lado del Novio -->
        <div
          v-if="config.padresNovio?.mostrar !== false && groomParentsList.length > 0"
          class="rounded-3xl border border-stone-200/80 p-6 shadow-sm sm:p-7"
          style="background-color: var(--color-surface)"
        >
          <span class="text-xs font-bold tracking-widest uppercase" style="color: var(--color-primary)">
            {{ config.padresNovio.titulo || 'Padres del Novio' }}
          </span>
          <div class="mt-3">
            <template v-for="(pName, idx) in groomParentsList" :key="idx">
              <span
                v-if="idx > 0"
                class="my-1 block font-script-elegant text-xl"
                style="color: var(--color-secondary)"
              >
                &amp;
              </span>
              <p class="font-serif-elegant text-2xl font-semibold">
                {{ pName }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 5. LUGAR, FECHA Y HORA (MISA Y/O RECEPCIÓN)                         -->
    <!-- =================================================================== -->
    <section class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div class="text-center">
        <span class="text-xs font-bold tracking-[0.2em] uppercase" style="color: var(--color-secondary)">
          Dónde y Cuándo
        </span>
        <h2 class="font-serif-elegant section-title-fluid mt-1.5 font-bold">
          Detalles de la Celebración
        </h2>
        <p class="mt-1.5 text-sm text-stone-600 sm:text-base">{{ config.fechaTexto }}</p>
      </div>

      <div
        class="mt-8 grid gap-6 sm:mt-10 sm:gap-8"
        :class="config.modalidadLugar === 'ambos' ? 'md:grid-cols-2' : 'mx-auto max-w-xl'"
      >
        <!-- Tarjeta Misa / Ceremonia -->
        <article
          v-if="config.modalidadLugar === 'ambos' || config.modalidadLugar === 'misa'"
          class="flex flex-col justify-between rounded-3xl border border-stone-200/90 p-6 text-center shadow-md sm:p-8"
          style="background-color: var(--color-surface)"
        >
          <div>
            <div
              class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
              style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary)"
            >
              <Church class="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h3 class="font-serif-elegant mt-4 text-2xl font-bold sm:mt-5 sm:text-3xl">
              {{ config.misa.titulo }}
            </h3>
            <div class="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-1.5 text-xs font-semibold text-stone-800 sm:text-sm">
              <Clock class="h-4 w-4 shrink-0" style="color: var(--color-primary)" />
              <span>Hora: {{ config.misa.hora }}</span>
            </div>
            <p class="mt-4 text-base font-bold text-stone-900 sm:text-lg">
              {{ config.misa.lugar }}
            </p>
            <p class="mt-1 text-xs text-stone-600 sm:text-sm">
              {{ config.misa.direccion }}
            </p>
          </div>

          <div class="mt-6 border-t border-stone-100 pt-4 sm:mt-7">
            <a
              :href="config.misa.mapaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 sm:text-sm"
              style="background-color: var(--color-primary)"
            >
              <MapPin class="h-4 w-4 shrink-0" />
              <span>Abrir ubicación en Google Maps</span>
              <ExternalLink class="h-3.5 w-3.5 shrink-0 opacity-80" />
            </a>
          </div>
        </article>

        <!-- Tarjeta Recepción / Fiesta -->
        <article
          v-if="config.modalidadLugar === 'ambos' || config.modalidadLugar === 'recepcion'"
          class="flex flex-col justify-between rounded-3xl border border-stone-200/90 p-6 text-center shadow-md sm:p-8"
          style="background-color: var(--color-surface)"
        >
          <div>
            <div
              class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
              style="background-color: color-mix(in srgb, var(--color-secondary) 18%, transparent); color: var(--color-primary)"
            >
              <PartyPopper class="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h3 class="font-serif-elegant mt-4 text-2xl font-bold sm:mt-5 sm:text-3xl">
              {{ config.recepcion.titulo }}
            </h3>
            <div class="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-1.5 text-xs font-semibold text-stone-800 sm:text-sm">
              <Clock class="h-4 w-4 shrink-0" style="color: var(--color-primary)" />
              <span>Hora: {{ config.recepcion.hora }}</span>
            </div>
            <p class="mt-4 text-base font-bold text-stone-900 sm:text-lg">
              {{ config.recepcion.lugar }}
            </p>
            <p class="mt-1 text-xs text-stone-600 sm:text-sm">
              {{ config.recepcion.direccion }}
            </p>
          </div>

          <div class="mt-6 border-t border-stone-100 pt-4 sm:mt-7">
            <a
              :href="config.recepcion.mapaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 sm:text-sm"
              style="background-color: var(--color-primary)"
            >
              <MapPin class="h-4 w-4 shrink-0" />
              <span>Abrir ubicación en Google Maps</span>
              <ExternalLink class="h-3.5 w-3.5 shrink-0 opacity-80" />
            </a>
          </div>
        </article>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 6. PADRINOS Y CORTE DE HONOR                                        -->
    <!-- =================================================================== -->
    <section
      v-if="config.mostrarPadrinos || config.mostrarCorteHonor"
      class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div
        class="grid gap-6 sm:gap-8"
        :class="config.mostrarPadrinos && config.mostrarCorteHonor ? 'lg:grid-cols-2' : 'mx-auto max-w-2xl'"
      >
        <!-- Padrinos -->
        <div
          v-if="config.mostrarPadrinos && config.padrinos.length > 0"
          class="rounded-3xl border border-stone-200/80 p-6 shadow-sm sm:p-8"
          style="background-color: var(--color-surface)"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary)"
            >
              <Award class="h-6 w-6" />
            </div>
            <div>
              <span class="text-xs font-bold tracking-widest uppercase text-stone-400">Acompañamiento Especial</span>
              <h3 class="font-serif-elegant text-2xl font-bold sm:text-3xl">Padrinos</h3>
            </div>
          </div>

          <ul class="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
            <li
              v-for="padrino in config.padrinos"
              :key="padrino.id"
              class="rounded-2xl border border-stone-100 bg-stone-50/70 p-4"
            >
              <span class="text-xs font-bold tracking-wider uppercase" style="color: var(--color-primary)">
                {{ padrino.rol }}
              </span>
              <p class="font-serif-elegant mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
                {{ padrino.nombres }}
              </p>
            </li>
          </ul>
        </div>

        <!-- Corte de Honor -->
        <div
          v-if="config.mostrarCorteHonor && config.corteHonor.length > 0"
          class="rounded-3xl border border-stone-200/80 p-6 shadow-sm sm:p-8"
          style="background-color: var(--color-surface)"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style="background-color: color-mix(in srgb, var(--color-secondary) 20%, transparent); color: var(--color-primary)"
            >
              <Star class="h-6 w-6" />
            </div>
            <div>
              <span class="text-xs font-bold tracking-widest uppercase text-stone-400">Cortejo Especial</span>
              <h3 class="font-serif-elegant text-2xl font-bold sm:text-3xl">{{ config.tituloCorteHonor || 'Corte de Honor' }}</h3>
            </div>
          </div>

          <div class="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
            <div
              v-for="miembro in config.corteHonor"
              :key="miembro.id"
              class="rounded-2xl border border-stone-100 bg-stone-50/70 p-4"
            >
              <span class="text-xs font-bold tracking-wider uppercase" style="color: var(--color-secondary)">
                {{ miembro.rol }}
              </span>
              <p class="mt-1 text-sm font-semibold text-stone-900 sm:text-base">
                {{ miembro.nombre }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 7. GALERÍA DE FOTOS (SOPORTA LINKS DE GOOGLE DRIVE)                 -->
    <!-- =================================================================== -->
    <section v-if="galleryResolved.length > 0" class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div class="text-center">
        <span class="text-xs font-bold tracking-[0.2em] uppercase" style="color: var(--color-secondary)">
          Recuerdos &amp; Ilusiones
        </span>
        <h2 class="font-serif-elegant section-title-fluid mt-1.5 font-bold">Galería Especial</h2>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 md:grid-cols-3 sm:gap-5">
        <div
          v-for="(imgUrl, idx) in galleryResolved"
          :key="idx"
          class="group overflow-hidden rounded-3xl border border-stone-200 bg-stone-100 shadow-sm aspect-[4/5]"
        >
          <img
            :src="imgUrl"
            :alt="`${protagonistTitle} - Foto ${idx + 1}`"
            loading="lazy"
            class="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 8. CÓDIGO DE VESTIMENTA (OPCIONAL) Y REGALO (INCLUYE SIN REGALO)    -->
    <!-- =================================================================== -->
    <section class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <!-- Vestimenta (Opcional: solo se muestra si config.mostrarVestimenta es true) -->
      <div
        v-if="config.mostrarVestimenta !== false"
        class="mb-10 rounded-3xl border border-stone-200/80 p-6 text-center shadow-sm sm:p-8"
        style="background-color: var(--color-surface)"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary)"
        >
          <Shirt class="h-7 w-7" />
        </div>
        <h3 class="font-serif-elegant mt-4 text-2xl font-bold sm:text-3xl">Código de Vestimenta</h3>
        <p class="mt-2 text-base font-semibold sm:text-lg" style="color: var(--color-primary)">
          {{ config.codigoVestimenta }}
        </p>
        <p v-if="config.notaVestimenta" class="mx-auto mt-1.5 max-w-md text-xs text-stone-600 sm:text-sm">
          {{ config.notaVestimenta }}
        </p>
      </div>

      <!-- CASO A: OPCIÓN "SIN REGALO" (Solo agradecer presencia con buenas palabras) -->
      <div
        v-if="config.tipoRegalo === 'sin_regalo'"
        class="mx-auto max-w-2xl rounded-3xl border p-7 text-center shadow-sm sm:p-10"
        style="background-color: var(--color-surface); border-color: color-mix(in srgb, var(--color-secondary) 45%, transparent)"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary)"
        >
          <Heart class="h-7 w-7" />
        </div>
        <span class="mt-4 block text-xs font-bold tracking-[0.2em] uppercase" style="color: var(--color-secondary)">
          Nuestro Mayor Obsequio
        </span>
        <h2 class="font-serif-elegant mt-1 text-2xl font-bold sm:text-4xl">
          {{ config.infoSinRegalo?.titulo || 'Tu Presencia es Nuestro Mejor Regalo' }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
          {{ config.infoSinRegalo?.descripcion }}
        </p>
      </div>

      <!-- CASO B: CON SUGERENCIA DE REGALO (SOBRE, TRADICIONAL O AMBOS) -->
      <div v-else>
        <div class="text-center">
          <span class="text-xs font-bold tracking-[0.2em] uppercase" style="color: var(--color-secondary)">
            Muestras de Cariño
          </span>
          <h2 class="font-serif-elegant section-title-fluid mt-1.5 font-bold">Opciones de Regalo</h2>
          <p class="mx-auto mt-2 max-w-2xl text-sm text-stone-600 sm:text-base">
            {{ config.fraseRegalo }}
          </p>
        </div>

        <div
          class="mt-6 grid gap-6 sm:mt-8"
          :class="config.tipoRegalo === 'ambos' ? 'md:grid-cols-2' : 'mx-auto max-w-xl'"
        >
          <!-- Regalo de Sobre / Efectivo -->
          <div
            v-if="config.tipoRegalo === 'sobre' || config.tipoRegalo === 'ambos'"
            class="rounded-3xl border border-stone-200/90 p-6 shadow-sm sm:p-8"
            style="background-color: var(--color-surface)"
          >
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl"
              style="background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary)"
            >
              <Mail class="h-7 w-7" />
            </div>
            <h3 class="font-serif-elegant mt-4 text-2xl font-bold sm:mt-5 sm:text-3xl">
              {{ config.infoSobre.titulo }}
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
              {{ config.infoSobre.descripcion }}
            </p>

            <div
              v-if="config.infoSobre.mostrarCuenta && config.infoSobre.numeroCuenta"
              class="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left text-xs sm:text-sm"
            >
              <p class="text-[11px] font-bold tracking-wider uppercase text-stone-400">
                Transferencia o Depósito Bancario
              </p>
              <p class="mt-1 font-semibold text-stone-800">{{ config.infoSobre.banco }}</p>
              <p class="text-stone-600">Titular: {{ config.infoSobre.titular }}</p>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
                <code class="text-xs font-bold text-stone-900 sm:text-sm">{{ config.infoSobre.numeroCuenta }}</code>
                <button
                  type="button"
                  @click="copyAccountNumber"
                  class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                  style="background-color: var(--color-primary)"
                >
                  <Check v-if="copiedBank" class="h-3.5 w-3.5" />
                  <Copy v-else class="h-3.5 w-3.5" />
                  <span>{{ copiedBank ? 'Copiado' : 'Copiar' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Regalo Tradicional / Mesa de Regalos -->
          <div
            v-if="config.tipoRegalo === 'tradicional' || config.tipoRegalo === 'ambos'"
            class="rounded-3xl border border-stone-200/90 p-6 shadow-sm sm:p-8"
            style="background-color: var(--color-surface)"
          >
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl"
              style="background-color: color-mix(in srgb, var(--color-secondary) 20%, transparent); color: var(--color-primary)"
            >
              <Gift class="h-7 w-7" />
            </div>
            <h3 class="font-serif-elegant mt-4 text-2xl font-bold sm:mt-5 sm:text-3xl">
              {{ config.infoTradicional.titulo }}
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
              {{ config.infoTradicional.descripcion }}
            </p>

            <div class="mt-5 space-y-3 sm:mt-6">
              <a
                v-if="config.infoTradicional.tienda1Nombre"
                :href="config.infoTradicional.tienda1Url || '#'"
                target="_blank"
                rel="noopener noreferrer"
                class="flex min-h-12 items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold text-stone-800 transition hover:bg-stone-100 sm:text-sm"
              >
                <span>{{ config.infoTradicional.tienda1Nombre }}</span>
                <ExternalLink class="h-4 w-4 shrink-0 text-stone-500" />
              </a>
              <a
                v-if="config.infoTradicional.tienda2Nombre"
                :href="config.infoTradicional.tienda2Url || '#'"
                target="_blank"
                rel="noopener noreferrer"
                class="flex min-h-12 items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold text-stone-800 transition hover:bg-stone-100 sm:text-sm"
              >
                <span>{{ config.infoTradicional.tienda2Nombre }}</span>
                <ExternalLink class="h-4 w-4 shrink-0 text-stone-500" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 9. CONFIRMACIÓN DE ASISTENCIA (CONECTADA A GOOGLE SHEETS)           -->
    <!-- =================================================================== -->
    <section id="confirmar" class="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div
        class="rounded-3xl border border-stone-200/90 p-5 shadow-xl sm:p-10"
        style="background-color: var(--color-surface)"
      >
        <div class="text-center">
          <span class="text-xs font-bold tracking-[0.2em] uppercase" style="color: var(--color-secondary)">
            R.S.V.P.
          </span>
          <h2 class="font-serif-elegant section-title-fluid mt-1 font-bold">
            Confirmación de Asistencia
          </h2>
          <p class="mt-2 text-xs text-stone-600 sm:text-sm">
            Favor confirmar antes del <strong>{{ config.fechaLimiteConfirmacion }}</strong>
          </p>

          <!-- Resumen del Pase -->
          <div
            class="mt-4 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-semibold sm:gap-2 sm:px-4"
            style="border-color: color-mix(in srgb, var(--color-primary) 30%, transparent); background-color: color-mix(in srgb, var(--color-primary) 6%, transparent)"
          >
            <Ticket class="h-4 w-4 shrink-0" style="color: var(--color-primary)" />
            <span>Invitación para: <strong>{{ guestParamName }}</strong></span>
            <span>•</span>
            <span>Cupo máximo: <strong>{{ guestMaxPasses }} {{ guestMaxPasses === 1 ? 'persona' : 'personas' }}</strong></span>
          </div>
        </div>

        <!-- Estado Confirmado -->
        <div
          v-if="rsvpSubmitted"
          role="status"
          aria-live="polite"
          class="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center sm:mt-8 sm:p-6"
        >
          <CheckCircle2 class="mx-auto h-12 w-12 text-emerald-600" />
          <h3 class="font-serif-elegant mt-3 text-2xl font-bold text-stone-900 sm:text-3xl">
            ¡Gracias por confirmar!
          </h3>
          <p class="mt-2 text-xs text-stone-700 sm:text-sm">
            Hemos registrado la respuesta de <strong>{{ rsvpForm.nombreConfirmado }}</strong>
            <span v-if="rsvpForm.asistira === 'si'">
              para <strong>{{ rsvpForm.cantidadPersonas }} {{ rsvpForm.cantidadPersonas === 1 ? 'persona' : 'personas' }}</strong>.
            </span>
            <span v-else> indicando que no podrá acompañarnos en esta ocasión.</span>
          </p>

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              v-if="config.whatsappConfirmacion"
              :href="whatsappDirectUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:text-sm"
            >
              <MessageCircle class="h-4 w-4 shrink-0" />
              <span>Enviar también aviso por WhatsApp</span>
            </a>
            <button
              type="button"
              @click="rsvpSubmitted = false"
              class="inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              Modificar mi respuesta
            </button>
          </div>
        </div>

        <!-- Formulario RSVP accesible y validado -->
        <form
          v-else
          aria-labelledby="rsvp-form-heading"
          class="mt-7 space-y-5 sm:mt-8 sm:space-y-6"
          novalidate
          @submit.prevent="handleRsvpSubmit"
        >
          <h3 id="rsvp-form-heading" class="visually-hidden">Formulario para confirmar asistencia</h3>

          <!-- Nombre del Invitado / Familia -->
          <div class="flex flex-col gap-1.5">
            <label for="rsvp-nombre" class="text-xs font-semibold text-stone-800 sm:text-sm">
              Nombre completo o Familia que confirma <span aria-hidden="true" class="text-red-600">*</span>
            </label>
            <input
              id="rsvp-nombre"
              ref="nombreInputRef"
              v-model="rsvpForm.nombreConfirmado"
              type="text"
              name="nombreConfirmado"
              autocomplete="name"
              required
              minlength="2"
              :aria-invalid="isNameInvalid ? 'true' : undefined"
              aria-describedby="rsvp-nombre-hint"
              class="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-xs transition"
              @blur="fieldTouched.nombreConfirmado = true"
              @input="formError = ''"
            />
            <span id="rsvp-nombre-hint" class="text-xs text-stone-500">
              Puedes dejar el nombre de tu familia o escribir los nombres de quienes asisten.
            </span>
          </div>

          <!-- ¿Asistirá? (2 opciones -> radio buttons visibles) -->
          <fieldset class="space-y-2.5">
            <legend class="text-xs font-semibold text-stone-800 sm:text-sm">
              ¿Podrás acompañarnos en este día especial? <span aria-hidden="true" class="text-red-600">*</span>
            </legend>
            <div class="grid gap-3 sm:grid-cols-2">
              <label
                for="asistira-si"
                class="flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition sm:p-4"
                :class="
                  rsvpForm.asistira === 'si'
                    ? 'border-pink-600 bg-pink-50/50 font-semibold text-stone-900'
                    : 'border-stone-200 bg-stone-50/50 text-stone-700'
                "
              >
                <input
                  id="asistira-si"
                  v-model="rsvpForm.asistira"
                  type="radio"
                  name="asistira"
                  value="si"
                  class="h-4 w-4 shrink-0 accent-pink-700"
                />
                <span>¡Sí, asistiré con mucho gusto!</span>
              </label>

              <label
                for="asistira-no"
                class="flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition sm:p-4"
                :class="
                  rsvpForm.asistira === 'no'
                    ? 'border-stone-600 bg-stone-100 font-semibold text-stone-900'
                    : 'border-stone-200 bg-stone-50/50 text-stone-700'
                "
              >
                <input
                  id="asistira-no"
                  v-model="rsvpForm.asistira"
                  type="radio"
                  name="asistira"
                  value="no"
                  class="h-4 w-4 shrink-0 accent-stone-700"
                />
                <span>Lo siento, no podré asistir</span>
              </label>
            </div>
          </fieldset>

          <!-- Cantidad de personas que asistirán (limitado por ?pases=N) -->
          <div v-if="rsvpForm.asistira === 'si'" class="flex flex-col gap-1.5">
            <label for="rsvp-cantidad" class="text-xs font-semibold text-stone-800 sm:text-sm">
              Cantidad de personas que asistirán (Máximo {{ guestMaxPasses }})
            </label>
            <select
              id="rsvp-cantidad"
              v-model.number="rsvpForm.cantidadPersonas"
              name="cantidadPersonas"
              class="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-xs"
            >
              <option v-for="n in passOptions" :key="n" :value="n">
                {{ n }} {{ n === 1 ? 'persona confirmada' : 'personas confirmadas' }}
              </option>
            </select>
          </div>

          <!-- Teléfono de contacto -->
          <div class="flex flex-col gap-1.5">
            <label for="rsvp-telefono" class="text-xs font-semibold text-stone-800 sm:text-sm">
              Teléfono / WhatsApp de contacto (Opcional)
            </label>
            <input
              id="rsvp-telefono"
              v-model="rsvpForm.telefono"
              type="tel"
              name="telefono"
              autocomplete="tel"
              inputmode="tel"
              aria-describedby="rsvp-tel-hint"
              class="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-xs"
            />
            <span id="rsvp-tel-hint" class="text-xs text-stone-500">
              Ejemplo en El Salvador: 7123-4567
            </span>
          </div>

          <!-- Mensaje o buenos deseos -->
          <div class="flex flex-col gap-1.5">
            <label for="rsvp-mensaje" class="text-xs font-semibold text-stone-800 sm:text-sm">
              Dedica unas palabras o buenos deseos (Opcional)
            </label>
            <textarea
              id="rsvp-mensaje"
              v-model="rsvpForm.mensaje"
              name="mensaje"
              rows="3"
              class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 shadow-xs"
            ></textarea>
          </div>

          <!-- Mensaje de error accesible -->
          <div
            v-if="formError"
            role="alert"
            aria-live="assertive"
            class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 sm:text-sm"
          >
            {{ formError }}
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60 cursor-pointer sm:text-base"
            style="background-color: var(--color-primary)"
          >
            <Send class="h-5 w-5 shrink-0" />
            <span>
              {{ isSubmitting ? 'Guardando confirmación...' : 'Confirmar mi Asistencia' }}
            </span>
          </button>
        </form>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-stone-200/60 px-4 py-10 text-center text-xs text-stone-500">
      <p class="font-script-elegant text-3xl" style="color: var(--color-primary)">
        {{ protagonistTitle }}
      </p>
      <p class="mt-1">¡Te esperamos para celebrar juntos en El Salvador!</p>
    </footer>
  </div>
</template>
