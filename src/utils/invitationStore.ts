export type EventType = 'xv' | 'boda';
export type GiftType = 'sobre' | 'tradicional' | 'ambos' | 'sin_regalo';
export type LocationMode = 'ambos' | 'misa' | 'recepcion';
export type ParentMode = 'ambos' | 'madre' | 'padre';

export interface PadrinoItem {
  id: string;
  rol: string;
  nombres: string;
}

export interface CorteItem {
  id: string;
  rol: string;
  nombre: string;
}

export interface GuestItem {
  id: string;
  nombre: string;
  pases: number;
  mesa?: string;
  telefono?: string;
  nota?: string;
  enviado?: boolean;
}

export interface RsvpResponse {
  id: string;
  fechaRegistro: string;
  invitadoParam: string;
  nombreConfirmado: string;
  asistira: 'si' | 'no';
  cantidadPersonas: number;
  pasesMaximos: number;
  telefono: string;
  mensaje: string;
  restriccionAlimentaria?: string;
}

export interface InvitationConfig {
  tipoEvento: EventType;
  tituloPortada: string;
  subtituloPortada: string;

  // Protagonistas
  nombreQuinceanera: string;
  nombreNovia: string;
  nombreNovio: string;

  // Frase inicial / Texto bíblico
  tipoMensajeInicial: 'especial' | 'biblico';
  mensajeInicial: string;
  citaBiblicaAutor: string;

  // Padres / Anfitriones (Soporta plural, singular, femenino o masculino)
  mostrarPadres: boolean;
  encabezadoPadres: string;
  tituloSeccionPadres: string; // Ej: "Mis Padres", "Mi Madre", "Mi Padre", "Nuestros Padres"
  padresQuinceanera: {
    modalidad: ParentMode;
    padre: string;
    madre: string;
  };
  padresNovia: {
    mostrar: boolean;
    modalidad: ParentMode;
    titulo: string; // Ej: "Padres de la Novia", "Madre de la Novia", "Padre de la Novia"
    padre: string;
    madre: string;
  };
  padresNovio: {
    mostrar: boolean;
    modalidad: ParentMode;
    titulo: string; // Ej: "Padres del Novio", "Madre del Novio", "Padre del Novio"
    padre: string;
    madre: string;
  };
  quienesInvitanExtra: string;

  // Fecha y Lugar (Misa y Recepción)
  fechaEventoISO: string; // YYYY-MM-DDTHH:mm
  fechaTexto: string;     // Ej: Sábado 19 de Diciembre de 2026
  modalidadLugar: LocationMode;

  misa: {
    titulo: string;
    lugar: string;
    direccion: string;
    hora: string;
    mapaUrl: string;
  };

  recepcion: {
    titulo: string;
    lugar: string;
    direccion: string;
    hora: string;
    mapaUrl: string;
  };

  // Padrinos y Corte de Honor
  mostrarPadrinos: boolean;
  padrinos: PadrinoItem[];
  mostrarCorteHonor: boolean;
  tituloCorteHonor: string;
  corteHonor: CorteItem[];

  // Código de vestimenta (Opcional)
  mostrarVestimenta: boolean;
  codigoVestimenta: string;
  notaVestimenta: string;

  // Regalo (Sobre, Tradicional, Ambos o Sin Regalo / Solo Presencia)
  tipoRegalo: GiftType;
  fraseRegalo: string;
  infoSinRegalo: {
    titulo: string;
    descripcion: string;
  };
  infoSobre: {
    titulo: string;
    descripcion: string;
    mostrarCuenta: boolean;
    banco: string;
    numeroCuenta: string;
    titular: string;
  };
  infoTradicional: {
    titulo: string;
    descripcion: string;
    tienda1Nombre: string;
    tienda1Url: string;
    tienda2Nombre: string;
    tienda2Url: string;
  };

  // Colores y Estética
  colores: {
    primario: string;
    secundario: string;
    fondo: string;
    superficie: string;
    texto: string;
  };

  // Imágenes (Links de Google Drive o externos)
  imagenes: {
    heroUrl: string;
    secundariaUrl: string;
    galeriaUrls: string[];
  };

  // Contacto y Google Sheets
  whatsappConfirmacion: string;
  fechaLimiteConfirmacion: string;
  googleScriptUrl: string;
}

export interface ThemePreset {
  id: string;
  nombre: string;
  badge: string;
  colores: InvitationConfig['colores'];
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'xv-rosa-oro',
    nombre: 'Rosa Imperial & Oro',
    badge: 'Ideal XV Años',
    colores: {
      primario: '#be185d',
      secundario: '#d4af37',
      fondo: '#fff9fb',
      superficie: '#ffffff',
      texto: '#292524',
    },
  },
  {
    id: 'boda-champagne',
    nombre: 'Marfil & Champán Dorado',
    badge: 'Ideal Boda',
    colores: {
      primario: '#856846',
      secundario: '#c5a059',
      fondo: '#fdfbf7',
      superficie: '#ffffff',
      texto: '#272421',
    },
  },
  {
    id: 'xv-azul-real',
    nombre: 'Azul Real & Plata',
    badge: 'XV / Noche de Gala',
    colores: {
      primario: '#1e3a8a',
      secundario: '#94a3b8',
      fondo: '#f8fafc',
      superficie: '#ffffff',
      texto: '#0f172a',
    },
  },
  {
    id: 'esmeralda-oro',
    nombre: 'Verde Esmeralda & Oro',
    badge: 'XV / Boda Elegante',
    colores: {
      primario: '#065f46',
      secundario: '#d4af37',
      fondo: '#f6fbf9',
      superficie: '#ffffff',
      texto: '#1c2826',
    },
  },
  {
    id: 'lavanda-ensueno',
    nombre: 'Lavanda & Oro Rosa',
    badge: 'Ideal XV Años',
    colores: {
      primario: '#6d28d9',
      secundario: '#e19898',
      fondo: '#faf7ff',
      superficie: '#ffffff',
      texto: '#261e35',
    },
  },
  {
    id: 'terracota-boho',
    nombre: 'Terracota & Olivo',
    badge: 'Boda Jardín / Playa',
    colores: {
      primario: '#9a3412',
      secundario: '#b48a5a',
      fondo: '#fcf9f5',
      superficie: '#ffffff',
      texto: '#292524',
    },
  },
];

export const DRESS_CODE_PRESETS = [
  'Formal de Gala',
  'Formal Elegante',
  'Semi-Formal / Coctel',
  'Casual Elegante',
  'Guayabera / Lino (Jardín o Playa)',
  'Vestimenta Libre',
];

export const NO_GIFT_TEMPLATES = [
  'El mejor regalo que podemos recibir en este día tan especial es contar con tu valiosa presencia, tus oraciones y tus buenos deseos. ¡Muchas gracias por acompañarnos y compartir nuestra alegría!',
  'No necesitamos ningún obsequio material; el mayor regalo para nuestra familia es tenerte a nuestro lado celebrando este momento inolvidable. ¡Con tu presencia estaremos profundamente agradecidos!',
  'Tu cariño y compañía en esta fecha tan esperada son nuestro verdadero tesoro. Te esperamos con los brazos abiertos para disfrutar juntos de esta gran bendición.',
];

export const QUOTE_TEMPLATES = {
  xvEspecial:
    'Hoy es un día especial porque dejo atrás mi infancia para comenzar un nuevo camino lleno de sueños, ilusiones y esperanzas. Agradezco a Dios por guiar cada uno de mis pasos y a ti por acompañarme en esta noche inolvidable.',
  bodaEspecial:
    'Dos almas que han decidido pasar el resto de sus vidas juntas, caminando de la mano con amor, respeto y complicidad. Nuestra historia comienza un nuevo capítulo y queremos celebrarlo junto a las personas que más amamos.',
  biblico1:
    'El amor es paciente, es bondadoso. El amor no es envidioso ni jactancioso ni orgulloso. Todo lo disculpa, todo lo cree, todo lo espera, todo lo soporta.',
  biblico1Autor: '1 Corintios 13:4-7',
  biblico2:
    'Todo tiene su tiempo, y todo lo que se quiere debajo del cielo tiene su hora. Dios hizo todo hermoso en su momento.',
  biblico2Autor: 'Eclesiastés 3:1, 11',
  biblico3:
    'Porque yo sé muy bien los planes que tengo para ustedes —afirma el Señor—, planes de bienestar y no de calamidad, a fin de darles un futuro y una esperanza.',
  biblico3Autor: 'Jeremías 29:11',
};

export const ENV_GOOGLE_SCRIPT_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_GOOGLE_SCRIPT_URL) || '';

export const DEFAULT_CONFIG: InvitationConfig = {
  tipoEvento: 'xv',
  tituloPortada: 'Mis Quince Años',
  subtituloPortada: 'Una noche mágica para recordar por siempre',

  nombreQuinceanera: 'Sofía Valentina Morales',
  nombreNovia: 'María Fernanda Rivas',
  nombreNovio: 'José Alejandro Cáceres',

  tipoMensajeInicial: 'especial',
  mensajeInicial: QUOTE_TEMPLATES.xvEspecial,
  citaBiblicaAutor: 'Eclesiastés 3:1',

  mostrarPadres: true,
  encabezadoPadres: 'Con la bendición de Dios y el amor de mis padres',
  tituloSeccionPadres: 'Mis Padres',
  padresQuinceanera: {
    modalidad: 'ambos',
    padre: 'Roberto Carlos Morales',
    madre: 'Claudia Beatriz Hernández de Morales',
  },
  padresNovia: {
    mostrar: true,
    modalidad: 'ambos',
    titulo: 'Padres de la Novia',
    padre: 'Carlos Eduardo Rivas',
    madre: 'Ana Patricia Gómez de Rivas',
  },
  padresNovio: {
    mostrar: true,
    modalidad: 'ambos',
    titulo: 'Padres del Novio',
    padre: 'Jorge Alberto Cáceres',
    madre: 'Silvia Margarita Lemus de Cáceres',
  },
  quienesInvitanExtra: '',

  fechaEventoISO: '2026-12-19T17:00',
  fechaTexto: 'Sábado 19 de Diciembre de 2026',
  modalidadLugar: 'ambos',

  misa: {
    titulo: 'Ceremonia Religiosa',
    lugar: 'Basílica de Nuestra Señora de Guadalupe (La Ceiba)',
    direccion: 'Antiguo Cuscatlán, La Libertad, El Salvador',
    hora: '4:30 PM',
    mapaUrl: 'https://maps.google.com/?q=Basilica+de+Nuestra+Senora+de+Guadalupe+Antiguo+Cuscatlan',
  },

  recepcion: {
    titulo: 'Recepción & Fiesta de Gala',
    lugar: 'Hacienda Los Miranda',
    direccion: 'Calle Circunvalación, Antiguo Cuscatlán, El Salvador',
    hora: '6:30 PM',
    mapaUrl: 'https://maps.google.com/?q=Hacienda+Los+Miranda+Antiguo+Cuscatlan',
  },

  mostrarPadrinos: true,
  padrinos: [
    {
      id: 'p1',
      rol: 'Padrinos de Honor',
      nombres: 'Ing. Mauricio Aguilar & Licda. Gabriela de Aguilar',
    },
    {
      id: 'p2',
      rol: 'Padrinos de Brindis',
      nombres: 'Dr. Fernando Morales & Dra. Elena de Morales',
    },
    {
      id: 'p3',
      rol: 'Padrinos de Anillo y Medalla',
      nombres: 'Lic. Rodrigo Hernández & Sra. Patricia de Hernández',
    },
  ],

  mostrarCorteHonor: true,
  tituloCorteHonor: 'Corte de Honor',
  corteHonor: [
    { id: 'c1', rol: 'Chambelán de Honor', nombre: 'Mateo Andrés Morales' },
    { id: 'c2', rol: 'Dama de Honor', nombre: 'Valeria Nicole Aguilar' },
    { id: 'c3', rol: 'Dama de Honor', nombre: 'Camila Alejandra Rivas' },
    { id: 'c4', rol: 'Dama de Honor', nombre: 'Lucía Fernanda Gómez' },
  ],

  mostrarVestimenta: true,
  codigoVestimenta: 'Formal de Gala',
  notaVestimenta: 'Se reserva el color Rosa Dorado exclusivamente para la Quinceañera.',

  tipoRegalo: 'ambos',
  fraseRegalo:
    'Tu presencia en este día tan especial es nuestro mejor regalo, pero si deseas tener un detalle con nosotros, te compartimos estas opciones:',
  infoSinRegalo: {
    titulo: 'Tu Presencia es Nuestro Mejor Regalo',
    descripcion: NO_GIFT_TEMPLATES[0],
  },
  infoSobre: {
    titulo: 'Regalo de Sobre (Lluvia de Sobres)',
    descripcion:
      'En la entrada de la recepción contaremos con un cofre especial para depositar tu sobre de efectivo con tus mejores deseos.',
    mostrarCuenta: true,
    banco: 'Banco Agrícola (El Salvador)',
    numeroCuenta: '3100-458921-7 (Cuenta de Ahorro)',
    titular: 'Claudia Beatriz Hernández de Morales',
  },
  infoTradicional: {
    titulo: 'Mesa de Regalos & Tradicional',
    descripcion:
      'También puedes elegir un obsequio de nuestra lista sugerida o llevar tu regalo tradicional a la recepción.',
    tienda1Nombre: 'Almacenes Siman - Evento #48920',
    tienda1Url: 'https://sv.siman.com',
    tienda2Nombre: 'Lista de Deseos en Amazon',
    tienda2Url: 'https://www.amazon.com',
  },

  colores: {
    primario: '#be185d',
    secundario: '#d4af37',
    fondo: '#fff9fb',
    superficie: '#ffffff',
    texto: '#292524',
  },

  imagenes: {
    heroUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=85',
    secundariaUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
    ],
  },

  whatsappConfirmacion: '50370000000',
  fechaLimiteConfirmacion: '5 de Diciembre de 2026',
  googleScriptUrl: ENV_GOOGLE_SCRIPT_URL,
};

export const DEFAULT_GUESTS: GuestItem[] = [
  {
    id: 'g1',
    nombre: 'Familia Henríquez López',
    pases: 4,
    mesa: 'Mesa 3',
    telefono: '50371234567',
    nota: 'Tíos paternos',
    enviado: true,
  },
  {
    id: 'g2',
    nombre: 'Ing. Mauricio Aguilar y Esposa',
    pases: 2,
    mesa: 'Mesa Principal',
    telefono: '50378901234',
    nota: 'Padrinos de Honor',
    enviado: true,
  },
  {
    id: 'g3',
    nombre: 'Familia Meléndez Cornejo',
    pases: 5,
    mesa: 'Mesa 6',
    telefono: '50375554321',
    nota: 'Primos de Santa Tecla',
    enviado: false,
  },
  {
    id: 'g4',
    nombre: 'Srta. Andrea Valeria Portillo',
    pases: 1,
    mesa: 'Mesa Jóvenes 1',
    telefono: '',
    nota: 'Amiga del colegio',
    enviado: false,
  },
];

export const DEFAULT_RSVPS: RsvpResponse[] = [
  {
    id: 'r1',
    fechaRegistro: '15/11/2026, 4:20 p. m.',
    invitadoParam: 'Familia Henríquez López',
    nombreConfirmado: 'Carlos Henríquez y Familia',
    asistira: 'si',
    cantidadPersonas: 4,
    pasesMaximos: 4,
    telefono: '7123-4567',
    mensaje: '¡Muchas felicidades por los XV de Sofía! Ahí estaremos puntuales primero Dios.',
    restriccionAlimentaria: 'Ninguna',
  },
  {
    id: 'r2',
    fechaRegistro: '16/11/2026, 10:15 a. m.',
    invitadoParam: 'Ing. Mauricio Aguilar y Esposa',
    nombreConfirmado: 'Mauricio y Gabriela Aguilar',
    asistira: 'si',
    cantidadPersonas: 2,
    pasesMaximos: 2,
    telefono: '7890-1234',
    mensaje: 'Con mucho cariño acompañaremos a nuestra ahijada en este gran día.',
    restriccionAlimentaria: 'Ninguna',
  },
];

const STORAGE_KEYS = {
  CONFIG: 'sv_invitacion_config_v1',
  GUESTS: 'sv_invitacion_guests_v1',
  RSVPS: 'sv_invitacion_rsvps_v1',
};

/**
 * Convierte enlaces compartidos de Google Drive en enlaces directos de imagen
 */
export function resolveImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w1600`;
  }

  if (trimmed.includes('drive.google.com')) {
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w1600`;
    }
  }

  return trimmed;
}

/**
 * Extrae el ID corto del Web App de Google Apps Script para pasarlo en los links de invitados (?s=ID)
 * Ej: https://script.google.com/macros/s/AKfycbx123/exec -> AKfycbx123
 */
export function extractScriptId(scriptUrl: string): string {
  if (!scriptUrl) return '';
  const trimmed = scriptUrl.trim();
  const match = trimmed.match(/\/macros\/s\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Reconstruye la URL completa de Google Apps Script a partir de un ID corto o URL completa
 */
export function resolveScriptUrl(idOrUrl: string): string {
  if (!idOrUrl) return '';
  const trimmed = idOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://script.google.com/macros/s/${trimmed}/exec`;
}

export function mergeWithDefaultConfig(parsed: any): InvitationConfig {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!parsed || typeof parsed !== 'object') return base;
  return {
    ...base,
    ...parsed,
    googleScriptUrl:
      (typeof parsed.googleScriptUrl === 'string' && parsed.googleScriptUrl.trim()) ||
      base.googleScriptUrl,
    padresQuinceanera: {
      ...base.padresQuinceanera,
      ...(parsed.padresQuinceanera || {}),
    },
    padresNovia: {
      ...base.padresNovia,
      ...(parsed.padresNovia || {}),
    },
    padresNovio: {
      ...base.padresNovio,
      ...(parsed.padresNovio || {}),
    },
    colores: { ...base.colores, ...(parsed.colores || {}) },
    imagenes: { ...base.imagenes, ...(parsed.imagenes || {}) },
    misa: { ...base.misa, ...(parsed.misa || {}) },
    recepcion: { ...base.recepcion, ...(parsed.recepcion || {}) },
    infoSinRegalo: { ...base.infoSinRegalo, ...(parsed.infoSinRegalo || {}) },
    infoSobre: { ...base.infoSobre, ...(parsed.infoSobre || {}) },
    infoTradicional: { ...base.infoTradicional, ...(parsed.infoTradicional || {}) },
  };
}

export function loadLocalConfig(): InvitationConfig {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw);
    return mergeWithDefaultConfig(parsed);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveLocalConfig(config: InvitationConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function loadLocalGuests(): GuestItem[] {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_GUESTS);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (!raw) return structuredClone(DEFAULT_GUESTS);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_GUESTS);
  }
}

export function saveLocalGuests(guests: GuestItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(guests));
}

export function loadLocalRsvps(): RsvpResponse[] {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_RSVPS);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RSVPS);
    if (!raw) return structuredClone(DEFAULT_RSVPS);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_RSVPS);
  }
}

export function saveLocalRsvps(rsvps: RsvpResponse[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(rsvps));
}

/**
 * Sincronización con Google Sheets vía Google Apps Script Web App
 */
export async function syncConfigToGoogleSheets(
  scriptUrl: string,
  config: InvitationConfig
): Promise<{ ok: boolean; message: string }> {
  if (!scriptUrl) {
    return { ok: false, message: 'No se ha configurado la URL de Google Apps Script.' };
  }
  const trimmed = scriptUrl.trim();
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return {
      ok: false,
      message:
        'Pegaste el enlace de la hoja de Google Sheets. Debes pegar la URL de la Aplicación Web de Apps Script que termina en /exec.',
    };
  }
  try {
    const response = await fetch(trimmed, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveConfig',
        config,
      }),
    });
    const data = await response.json();
    if (data && data.ok) {
      return { ok: true, message: '¡Configuración sincronizada en Google Sheets correctamente!' };
    }
    return { ok: false, message: data?.message || 'Error al guardar en Google Sheets.' };
  } catch (err: any) {
    return {
      ok: false,
      message: `No se pudo conectar con Google Sheets. Verifica que la URL termine en /exec y tenga acceso para "Cualquier persona".`,
    };
  }
}

export async function fetchConfigFromGoogleSheets(
  scriptUrl: string
): Promise<InvitationConfig | null> {
  if (!scriptUrl) return null;
  const trimmed = scriptUrl.trim();
  if (trimmed.includes('docs.google.com/spreadsheets')) return null;
  try {
    const url = new URL(trimmed);
    url.searchParams.set('action', 'getConfig');
    url.searchParams.set('t', String(Date.now()));
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });
    const data = await response.json();
    if (data && data.ok && data.config) {
      return mergeWithDefaultConfig(data.config);
    }
    return null;
  } catch {
    return null;
  }
}

export async function submitRsvpToGoogleSheets(
  scriptUrl: string,
  rsvp: RsvpResponse
): Promise<{ ok: boolean; synced: boolean }> {
  const existing = loadLocalRsvps();
  existing.unshift(rsvp);
  saveLocalRsvps(existing);

  if (!scriptUrl) {
    return { ok: true, synced: false };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'addRsvp',
        rsvp,
      }),
    });
    const data = await response.json();
    return { ok: true, synced: Boolean(data?.ok) };
  } catch {
    return { ok: true, synced: false };
  }
}

export async function fetchRsvpsFromGoogleSheets(
  scriptUrl: string
): Promise<{ ok: boolean; rsvps: RsvpResponse[]; message: string }> {
  if (!scriptUrl) {
    return {
      ok: false,
      rsvps: loadLocalRsvps(),
      message: 'Mostrando respuestas locales. Configura la URL de Google Sheets para sincronizar en la nube.',
    };
  }
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getRsvps');
    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.json();
    if (data && data.ok && Array.isArray(data.rsvps)) {
      saveLocalRsvps(data.rsvps);
      return {
        ok: true,
        rsvps: data.rsvps,
        message: `Se sincronizaron ${data.rsvps.length} confirmaciones desde Google Sheets.`,
      };
    }
    return {
      ok: false,
      rsvps: loadLocalRsvps(),
      message: data?.message || 'Respuesta inválida desde Google Sheets.',
    };
  } catch (err: any) {
    return {
      ok: false,
      rsvps: loadLocalRsvps(),
      message: `Error al consultar Google Sheets: ${err?.message || 'Verifica la URL y permisos'}`,
    };
  }
}

export const GOOGLE_APPS_SCRIPT_CODE = `// ============================================================================
// CÓDIGO PARA GOOGLE SHEETS (Extensiones -> Apps Script)
// Soporta: Guardar/Leer Confirmaciones (RSVP) y Guardar/Leer Configuración
// ============================================================================

function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let rsvpSheet = ss.getSheetByName('Confirmaciones');
  if (!rsvpSheet) {
    rsvpSheet = ss.insertSheet('Confirmaciones');
    rsvpSheet.appendRow([
      'ID',
      'Fecha Registro',
      'Invitado (Link)',
      'Nombre Confirmado',
      'Asistirá',
      'Cantidad Personas',
      'Pases Máximos',
      'Teléfono',
      'Mensaje / Deseos',
      'Restricción Alimentaria'
    ]);
    rsvpSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#fce7f3');
  }

  let configSheet = ss.getSheetByName('Configuracion');
  if (!configSheet) {
    configSheet = ss.insertSheet('Configuracion');
    configSheet.appendRow(['Clave', 'JSON_Valor', 'Ultima_Actualizacion']);
    configSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#fef3c7');
  }

  return { ss, rsvpSheet, configSheet };
}

function doGet(e) {
  const { rsvpSheet, configSheet } = ensureSheets();
  const action = (e && e.parameter && e.parameter.action) || 'getRsvps';

  if (action === 'getConfig') {
    const rows = configSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === 'MAIN_CONFIG') {
        return jsonResponse({ ok: true, config: JSON.parse(rows[i][1]) });
      }
    }
    return jsonResponse({ ok: false, message: 'Aún no hay configuración guardada.' });
  }

  // Por defecto: devolver lista de confirmaciones (getRsvps)
  const rows = rsvpSheet.getDataRange().getValues();
  const rsvps = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    const r = rows[i];
    if (!r[0] && !r[3]) continue;
    rsvps.push({
      id: String(r[0] || i),
      fechaRegistro: String(r[1] || ''),
      invitadoParam: String(r[2] || ''),
      nombreConfirmado: String(r[3] || ''),
      asistira: String(r[4] || 'si').toLowerCase() === 'no' ? 'no' : 'si',
      cantidadPersonas: Number(r[5] || 0),
      pasesMaximos: Number(r[6] || 1),
      telefono: String(r[7] || ''),
      mensaje: String(r[8] || ''),
      restriccionAlimentaria: String(r[9] || '')
    });
  }

  return jsonResponse({ ok: true, rsvps });
}

function doPost(e) {
  try {
    const { rsvpSheet, configSheet } = ensureSheets();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'addRsvp') {
      const r = payload.rsvp;
      rsvpSheet.appendRow([
        r.id || new Date().getTime(),
        r.fechaRegistro || new Date().toLocaleString('es-SV'),
        r.invitadoParam || '',
        r.nombreConfirmado || '',
        r.asistira || 'si',
        r.cantidadPersonas || 0,
        r.pasesMaximos || 1,
        r.telefono || '',
        r.mensaje || '',
        r.restriccionAlimentaria || ''
      ]);
      return jsonResponse({ ok: true, message: 'Confirmación registrada' });
    }

    if (action === 'saveConfig') {
      const jsonStr = JSON.stringify(payload.config);
      const rows = configSheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'MAIN_CONFIG') {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow > 0) {
        configSheet.getRange(foundRow, 2).setValue(jsonStr);
        configSheet.getRange(foundRow, 3).setValue(new Date().toLocaleString('es-SV'));
      } else {
        configSheet.appendRow(['MAIN_CONFIG', jsonStr, new Date().toLocaleString('es-SV')]);
      }
      return jsonResponse({ ok: true, message: 'Configuración guardada' });
    }

    return jsonResponse({ ok: false, message: 'Acción no reconocida' });
  } catch (err) {
    return jsonResponse({ ok: false, message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
