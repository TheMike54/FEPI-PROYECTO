--
-- PostgreSQL database dump
--

\restrict LEVOOeonOEl3JlVljRQ5AK9OXa674tHjNSHgsZhbQNoCKMm1JRkPIpVqhq1Va7g

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg12+1)
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'residente',
    'contratista',
    'supervision',
    'dependencia',
    'finanzas'
);


--
-- Name: tipo_nota_bitacora; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_nota_bitacora AS ENUM (
    'instruccion',
    'acuerdo',
    'solicitud',
    'confirmacion',
    'respuesta'
);


--
-- Name: usuario_estado; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usuario_estado AS ENUM (
    'pendiente',
    'activo',
    'rechazado'
);


--
-- Name: sigecop_avance_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_avance_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Caso A: ANULACIÓN (corrección) — vigente→anulada, sin tocar cantidad/concepto/periodo/nota.
  IF OLD.estado = 'vigente' AND NEW.estado = 'anulada'
     AND NEW.cantidad = OLD.cantidad
     AND NEW.contrato_concepto_id = OLD.contrato_concepto_id
     AND NEW.contrato_periodo_id IS NOT DISTINCT FROM OLD.contrato_periodo_id
     AND NEW.nota_id IS NOT DISTINCT FROM OLD.nota_id THEN
    RETURN NEW;
  END IF;
  -- Caso B: asentar la NOTA DIFERIDA — sigue vigente; solo nota_id NULL→valor (abrirBitacora).
  IF OLD.estado = 'vigente' AND NEW.estado = 'vigente'
     AND OLD.nota_id IS NULL AND NEW.nota_id IS NOT NULL
     AND NEW.cantidad = OLD.cantidad
     AND NEW.contrato_concepto_id = OLD.contrato_concepto_id
     AND NEW.contrato_periodo_id IS NOT DISTINCT FROM OLD.contrato_periodo_id THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'concepto_avance es append-only (art. 123 fr. VI RLOPSRM): corregir = registro nuevo vinculado, no editar ni borrar (id=%)', OLD.id;
END;
$$;


--
-- Name: sigecop_bitacora_inalterable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_bitacora_inalterable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'La bitacora aperturada es un evento formal inalterable y no puede modificarse';
END;
$$;


--
-- Name: sigecop_convenio_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_convenio_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Identidad CONGELADA (lo sustantivo del convenio registrado).
  IF NEW.contrato_id            IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero              IS DISTINCT FROM OLD.numero
     OR NEW.folio               IS DISTINCT FROM OLD.folio
     OR NEW.tipo                IS DISTINCT FROM OLD.tipo
     OR NEW.fundamento          IS DISTINCT FROM OLD.fundamento
     OR NEW.motivo              IS DISTINCT FROM OLD.motivo
     OR NEW.fecha               IS DISTINCT FROM OLD.fecha
     OR NEW.monto_anterior      IS DISTINCT FROM OLD.monto_anterior
     OR NEW.monto_nuevo         IS DISTINCT FROM OLD.monto_nuevo
     OR NEW.plazo_anterior_dias IS DISTINCT FROM OLD.plazo_anterior_dias
     OR NEW.plazo_nuevo_dias    IS DISTINCT FROM OLD.plazo_nuevo_dias
     OR NEW.delta_monto_pct     IS DISTINCT FROM OLD.delta_monto_pct
     OR NEW.delta_plazo_pct     IS DISTINCT FROM OLD.delta_plazo_pct
     OR NEW.requiere_revision_sfp  IS DISTINCT FROM OLD.requiere_revision_sfp
     OR NEW.requiere_ajuste_costos IS DISTINCT FROM OLD.requiere_ajuste_costos
     OR NEW.created_at          IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un convenio modificatorio registrado es inalterable (art. 59 LOPSRM / art. 99 RLOPSRM)';
  END IF;
  -- nota_id: solo NULL→valor (asiento diferido al abrir la bitácora); una vez ligada, inmutable.
  IF OLD.nota_id IS NOT NULL AND NEW.nota_id IS DISTINCT FROM OLD.nota_id THEN
    RAISE EXCEPTION 'El convenio ya tiene su nota de bitácora ligada; el vínculo es inmutable';
  END IF;
  -- estado: SOLO la transición controlada registrado→autorizado (ITEM 3.2, art. 59 párr. 3 LOPSRM).
  IF OLD.estado = 'autorizado' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'El convenio ya está autorizado y surtió efecto; es inalterable (art. 59 LOPSRM)';
  END IF;
  IF OLD.estado = 'registrado' AND NEW.estado NOT IN ('registrado', 'autorizado') THEN
    RAISE EXCEPTION 'Transición de estado de convenio inválida';
  END IF;
  -- autorizado_por / autorizado_en: solo NULL→valor (sello del acto de autorización), una sola vez.
  IF OLD.autorizado_por IS NOT NULL AND NEW.autorizado_por IS DISTINCT FROM OLD.autorizado_por THEN
    RAISE EXCEPTION 'El autorizador del convenio es inmutable';
  END IF;
  IF OLD.autorizado_en IS NOT NULL AND NEW.autorizado_en IS DISTINCT FROM OLD.autorizado_en THEN
    RAISE EXCEPTION 'El sello de autorización del convenio es inmutable';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sigecop_documento_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_documento_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'El documento firmado del contrato es inmutable y no puede reemplazarse';
END;
$$;


--
-- Name: sigecop_estimacion_generador_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_estimacion_generador_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Un numero generador de estimacion es inalterable (append-only).';
END;
$$;


--
-- Name: sigecop_estimacion_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_estimacion_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.contrato_id              IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero                IS DISTINCT FROM OLD.numero
     OR NEW.periodo_inicio        IS DISTINCT FROM OLD.periodo_inicio
     OR NEW.periodo_fin           IS DISTINCT FROM OLD.periodo_fin
     OR NEW.anticipo_pct_snapshot IS DISTINCT FROM OLD.anticipo_pct_snapshot
     OR NEW.subtotal              IS DISTINCT FROM OLD.subtotal
     OR NEW.amortizacion          IS DISTINCT FROM OLD.amortizacion
     OR NEW.retencion             IS DISTINCT FROM OLD.retencion
     OR NEW.deductivas            IS DISTINCT FROM OLD.deductivas
     OR NEW.neto                  IS DISTINCT FROM OLD.neto
     OR NEW.integrada_por         IS DISTINCT FROM OLD.integrada_por
     OR NEW.integrada_en          IS DISTINCT FROM OLD.integrada_en THEN
    RAISE EXCEPTION 'La carátula de una estimación integrada es inalterable (art. 132 RLOPSRM); solo puede avanzar su estado';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sigecop_finiquito_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_finiquito_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Un finiquito elaborado es inalterable (art. 64 LOPSRM / 170 RLOPSRM); cierra el contrato y extingue las obligaciones.';
END;
$$;


--
-- Name: sigecop_firma_transicion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_firma_transicion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.firmado = true THEN
    RAISE EXCEPTION 'La firma ya fue registrada y es inalterable';
  END IF;
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
     OR NEW.rol_en_firma IS DISTINCT FROM OLD.rol_en_firma
     OR NEW.bitacora_id IS DISTINCT FROM OLD.bitacora_id THEN
    RAISE EXCEPTION 'No se puede reasignar la identidad de una firma';
  END IF;
  IF NOT (OLD.firmado = false AND NEW.firmado = true) THEN
    RAISE EXCEPTION 'Solo se permite la transicion de pendiente a firmado';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sigecop_garantia_endoso_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_garantia_endoso_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Un endoso de garantia es un registro historico inmutable (append-only)';
END;
$$;


--
-- Name: sigecop_nota_firma_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_nota_firma_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'La firma de una nota de bitácora es append-only y no puede modificarse';
END;
$$;


--
-- Name: sigecop_nota_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_nota_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.estado = 'anulada' THEN
    RAISE EXCEPTION 'La nota ya está anulada y es inalterable';
  END IF;
  IF NEW.bitacora_id IS DISTINCT FROM OLD.bitacora_id
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.asunto IS DISTINCT FROM OLD.asunto
     OR NEW.contenido IS DISTINCT FROM OLD.contenido
     OR NEW.emisor_id IS DISTINCT FROM OLD.emisor_id
     OR NEW.vinculada_a IS DISTINCT FROM OLD.vinculada_a
     OR NEW.fecha IS DISTINCT FROM OLD.fecha
     OR NEW.firmado_en IS DISTINCT FROM OLD.firmado_en
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una nota de bitácora es inalterable (art. 123 fr. VI RLOPSRM); use una nota vinculada para corregir';
  END IF;
  IF NOT (OLD.estado = 'emitida' AND NEW.estado = 'anulada') THEN
    RAISE EXCEPTION 'Solo se permite anular una nota emitida, no editarla';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sigecop_pago_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_pago_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Un pago registrado es inalterable (registro de auditoria).';
END;
$$;


--
-- Name: sigecop_programa_version_transicion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_programa_version_transicion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.contrato_id IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero    IS DISTINCT FROM OLD.numero
     OR NEW.convenio_id IS DISTINCT FROM OLD.convenio_id
     OR NEW.monto     IS DISTINCT FROM OLD.monto
     OR NEW.plazo_dias IS DISTINCT FROM OLD.plazo_dias
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una versión del programa es inmutable; un convenio crea una versión NUEVA (art. 59 LOPSRM)';
  END IF;
  IF OLD.vigente = false THEN
    RAISE EXCEPTION 'La versión ya fue superseded y es inalterable';
  END IF;
  RETURN NEW;  -- permite vigente true→false + supersedido_en
END;
$$;


--
-- Name: sigecop_roster_transicion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sigecop_roster_transicion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.contrato_id    IS DISTINCT FROM OLD.contrato_id
     OR NEW.rol         IS DISTINCT FROM OLD.rol
     OR NEW.usuario_id  IS DISTINCT FROM OLD.usuario_id
     OR NEW.vigencia_desde IS DISTINCT FROM OLD.vigencia_desde
     OR NEW.sustituye_a IS DISTINCT FROM OLD.sustituye_a
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Una asignación del roster es inmutable; la sustitución crea una fila NUEVA, no se reasigna (art. 125 fr. I g RLOPSRM)';
  END IF;
  IF OLD.vigencia_hasta IS NOT NULL THEN
    RAISE EXCEPTION 'La asignación ya fue cerrada y es inalterable';
  END IF;
  RETURN NEW;  -- permite cerrar (vigencia_hasta NULL→fecha) y ajustar metadatos (motivo/nota/registrado_por)
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerta_atraso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerta_atraso (
    id integer NOT NULL,
    contrato_concepto_id integer NOT NULL,
    umbral_pct numeric(5,2) NOT NULL,
    canal character varying(20) DEFAULT 'sistema'::character varying NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    creada_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alerta_atraso_canal_check CHECK (((canal)::text = ANY ((ARRAY['sistema'::character varying, 'correo'::character varying])::text[]))),
    CONSTRAINT alerta_atraso_umbral_pct_check CHECK (((umbral_pct >= (0)::numeric) AND (umbral_pct <= (100)::numeric)))
);


--
-- Name: alerta_atraso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerta_atraso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerta_atraso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerta_atraso_id_seq OWNED BY public.alerta_atraso.id;


--
-- Name: atraso_asentado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.atraso_asentado (
    id integer NOT NULL,
    contrato_concepto_id integer NOT NULL,
    periodo_numero integer NOT NULL,
    nota_id integer,
    asentado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: atraso_asentado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.atraso_asentado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atraso_asentado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.atraso_asentado_id_seq OWNED BY public.atraso_asentado.id;


--
-- Name: bitacora_aperturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_aperturas (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    parte_1_firmante character varying(200),
    parte_2_firmante character varying(200),
    parte_3_firmante character varying(200),
    fecha_apertura date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    apertura_en timestamp with time zone DEFAULT now() NOT NULL,
    acta jsonb DEFAULT '{}'::jsonb NOT NULL,
    aperturada_por integer,
    plazo_firma_dias integer DEFAULT 2 NOT NULL,
    domicilio_dependencia text,
    telefono_dependencia text,
    domicilio_contratista text,
    telefono_contratista text,
    descripcion_trabajos text,
    caracteristicas_sitio text,
    CONSTRAINT chk_bitacora_aperturas_plazo CHECK (((plazo_firma_dias >= 1) AND (plazo_firma_dias <= 60)))
);


--
-- Name: bitacora_aperturas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_aperturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_aperturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_aperturas_id_seq OWNED BY public.bitacora_aperturas.id;


--
-- Name: bitacora_firmantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_firmantes (
    id integer NOT NULL,
    bitacora_id integer NOT NULL,
    parte smallint,
    titulo character varying(120),
    firmante character varying(200),
    cargo_label character varying(60),
    cargo character varying(200),
    correo character varying(150),
    opcional boolean DEFAULT false NOT NULL,
    aplica boolean DEFAULT true NOT NULL,
    firmado boolean DEFAULT false NOT NULL,
    firmado_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    usuario_id integer,
    rol_en_firma text,
    CONSTRAINT chk_bitacora_firmantes_rol CHECK (((rol_en_firma IS NULL) OR (rol_en_firma = ANY (ARRAY['residente'::text, 'superintendente'::text, 'supervision'::text]))))
);


--
-- Name: bitacora_firmantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_firmantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_firmantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_firmantes_id_seq OWNED BY public.bitacora_firmantes.id;


--
-- Name: bitacora_nota_firmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_nota_firmas (
    id integer NOT NULL,
    nota_id integer NOT NULL,
    usuario_id integer,
    rol_en_firma text,
    firmado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bitacora_nota_firmas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_nota_firmas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_nota_firmas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_nota_firmas_id_seq OWNED BY public.bitacora_nota_firmas.id;


--
-- Name: bitacora_nota_tipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_nota_tipos (
    clave character varying(40) NOT NULL,
    etiqueta character varying(120) NOT NULL,
    rol_emisor character varying(20),
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_bitacora_nota_tipos_rol CHECK (((rol_emisor IS NULL) OR ((rol_emisor)::text = ANY ((ARRAY['residente'::character varying, 'superintendente'::character varying, 'supervision'::character varying])::text[]))))
);


--
-- Name: bitacora_notas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_notas (
    id integer NOT NULL,
    bitacora_id integer NOT NULL,
    tipo character varying(40) NOT NULL,
    contenido text NOT NULL,
    emisor_id integer,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    numero integer,
    asunto character varying(200),
    vinculada_a integer,
    estado character varying(20) DEFAULT 'emitida'::character varying NOT NULL,
    firmado_en timestamp with time zone,
    tag character varying(60),
    CONSTRAINT chk_bitacora_notas_estado CHECK (((estado)::text = ANY ((ARRAY['emitida'::character varying, 'anulada'::character varying])::text[])))
);


--
-- Name: bitacora_notas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_notas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_notas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_notas_id_seq OWNED BY public.bitacora_notas.id;


--
-- Name: concepto_avance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concepto_avance (
    id integer NOT NULL,
    contrato_concepto_id integer NOT NULL,
    contrato_periodo_id integer,
    nota_id integer,
    cantidad numeric(14,3) NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    observaciones text,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    estado text DEFAULT 'vigente'::text NOT NULL,
    reemplaza_a integer,
    anulada_por integer,
    anulada_en timestamp with time zone,
    CONSTRAINT chk_concepto_avance_estado CHECK ((estado = ANY (ARRAY['vigente'::text, 'anulada'::text]))),
    CONSTRAINT concepto_avance_cantidad_check CHECK ((cantidad >= (0)::numeric))
);


--
-- Name: concepto_avance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.concepto_avance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: concepto_avance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.concepto_avance_id_seq OWNED BY public.concepto_avance.id;


--
-- Name: contrato_actividades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_actividades (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    orden integer NOT NULL,
    actividad text NOT NULL,
    inicio date NOT NULL,
    termino date NOT NULL,
    peso numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_contrato_actividades_fechas CHECK ((termino >= inicio)),
    CONSTRAINT contrato_actividades_peso_check CHECK (((peso >= (0)::numeric) AND (peso <= (100)::numeric)))
);


--
-- Name: contrato_actividades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_actividades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_actividades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_actividades_id_seq OWNED BY public.contrato_actividades.id;


--
-- Name: contrato_conceptos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_conceptos (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    orden integer NOT NULL,
    concepto text NOT NULL,
    unidad character varying(20) NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    pu numeric(16,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    clave character varying(40),
    CONSTRAINT contrato_conceptos_cantidad_check CHECK ((cantidad >= (0)::numeric)),
    CONSTRAINT contrato_conceptos_pu_check CHECK ((pu >= (0)::numeric))
);


--
-- Name: contrato_conceptos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_conceptos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_conceptos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_conceptos_id_seq OWNED BY public.contrato_conceptos.id;


--
-- Name: contrato_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_documentos (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    nombre text NOT NULL,
    mime character varying(100) NOT NULL,
    tamano integer NOT NULL,
    contenido bytea NOT NULL,
    subido_en timestamp with time zone DEFAULT now() NOT NULL,
    tipo character varying(40) DEFAULT 'contrato'::character varying NOT NULL,
    convenio_id integer,
    CONSTRAINT chk_contrato_documentos_tipo CHECK (((tipo)::text = ANY ((ARRAY['contrato'::character varying, 'anticipo_autorizacion'::character varying, 'oficio_convenio'::character varying])::text[])))
);


--
-- Name: contrato_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_documentos_id_seq OWNED BY public.contrato_documentos.id;


--
-- Name: contrato_garantias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_garantias (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    tipo character varying(40) NOT NULL,
    afianzadora character varying(200),
    poliza character varying(60),
    monto numeric(14,2),
    vigencia date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_nombre text,
    pdf_mime character varying(100),
    pdf_tamano integer,
    pdf_contenido bytea,
    registrado_por integer,
    CONSTRAINT contrato_garantias_monto_check CHECK (((monto IS NULL) OR (monto >= (0)::numeric)))
);


--
-- Name: contrato_garantias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_garantias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_garantias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_garantias_id_seq OWNED BY public.contrato_garantias.id;


--
-- Name: contrato_periodos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_periodos (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    numero integer NOT NULL,
    inicio date NOT NULL,
    fin date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_contrato_periodos_fechas CHECK ((fin >= inicio)),
    CONSTRAINT contrato_periodos_numero_check CHECK ((numero >= 1))
);


--
-- Name: contrato_periodos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_periodos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_periodos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_periodos_id_seq OWNED BY public.contrato_periodos.id;


--
-- Name: contrato_roster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_roster (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    rol character varying(20) NOT NULL,
    usuario_id integer NOT NULL,
    vigencia_desde date DEFAULT CURRENT_DATE NOT NULL,
    vigencia_hasta date,
    motivo text,
    sustituye_a integer,
    nota_id integer,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_contrato_roster_vigencia CHECK (((vigencia_hasta IS NULL) OR (vigencia_hasta >= vigencia_desde))),
    CONSTRAINT contrato_roster_rol_check CHECK (((rol)::text = ANY ((ARRAY['residente'::character varying, 'superintendente'::character varying, 'supervision'::character varying])::text[])))
);


--
-- Name: contrato_roster_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contrato_roster_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contrato_roster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contrato_roster_id_seq OWNED BY public.contrato_roster.id;


--
-- Name: contratos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contratos (
    id integer NOT NULL,
    folio character varying(50) NOT NULL,
    tipo character varying(80),
    objeto text,
    contratista character varying(200),
    dependencia character varying(200),
    monto numeric(18,2),
    plazo_dias integer,
    fecha_inicio date,
    fecha_termino date,
    pdf_path text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    datos_juridicos jsonb,
    anticipo_pct numeric(5,2),
    penalizacion jsonb,
    amortizacion jsonb,
    ubicacion text,
    residente_id integer,
    superintendente_id integer,
    supervision_id integer,
    dependencia_id integer,
    ciclo_estimacion character varying(10),
    pena_convencional_pct numeric(5,4),
    estado character varying(20) DEFAULT 'vigente'::character varying NOT NULL,
    cerrado_en timestamp with time zone,
    CONSTRAINT chk_contratos_anticipo_pct CHECK (((anticipo_pct IS NULL) OR ((anticipo_pct >= (0)::numeric) AND (anticipo_pct <= (100)::numeric)))),
    CONSTRAINT chk_contratos_ciclo CHECK (((ciclo_estimacion IS NULL) OR ((ciclo_estimacion)::text = ANY ((ARRAY['mensual'::character varying, 'quincenal'::character varying])::text[])))),
    CONSTRAINT chk_contratos_estado CHECK (((estado)::text = ANY ((ARRAY['vigente'::character varying, 'cerrado'::character varying])::text[]))),
    CONSTRAINT chk_contratos_pena_pct CHECK (((pena_convencional_pct IS NULL) OR ((pena_convencional_pct >= (0)::numeric) AND (pena_convencional_pct <= (1)::numeric))))
);


--
-- Name: contratos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contratos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contratos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contratos_id_seq OWNED BY public.contratos.id;


--
-- Name: convenios_modificatorios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convenios_modificatorios (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    numero integer NOT NULL,
    folio character varying(50),
    tipo character varying(20) NOT NULL,
    fundamento character varying(20) DEFAULT 'art59'::character varying NOT NULL,
    motivo text NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    monto_anterior numeric(18,2),
    monto_nuevo numeric(18,2),
    plazo_anterior_dias integer,
    plazo_nuevo_dias integer,
    delta_monto_pct numeric(8,2),
    delta_plazo_pct numeric(8,2),
    requiere_revision_sfp boolean DEFAULT false NOT NULL,
    requiere_ajuste_costos boolean DEFAULT false NOT NULL,
    autorizado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nota_id integer,
    estado character varying(20) DEFAULT 'autorizado'::character varying NOT NULL,
    autorizado_en timestamp with time zone,
    CONSTRAINT chk_convenios_montos CHECK (((monto_nuevo IS NULL) OR (monto_nuevo >= (0)::numeric))),
    CONSTRAINT chk_convenios_plazo CHECK (((plazo_nuevo_dias IS NULL) OR (plazo_nuevo_dias > 0))),
    CONSTRAINT convenios_modificatorios_estado_check CHECK (((estado)::text = ANY ((ARRAY['registrado'::character varying, 'autorizado'::character varying])::text[]))),
    CONSTRAINT convenios_modificatorios_fundamento_check CHECK (((fundamento)::text = ANY ((ARRAY['art59'::character varying, 'art59bis'::character varying])::text[]))),
    CONSTRAINT convenios_modificatorios_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['monto'::character varying, 'plazo'::character varying, 'programa'::character varying, 'mixto'::character varying])::text[])))
);


--
-- Name: convenios_modificatorios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.convenios_modificatorios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: convenios_modificatorios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.convenios_modificatorios_id_seq OWNED BY public.convenios_modificatorios.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    tipo character varying(20) DEFAULT 'contratista'::character varying NOT NULL,
    estado character varying(20) DEFAULT 'validada'::character varying NOT NULL,
    CONSTRAINT empresas_estado_check CHECK (((estado)::text = ANY ((ARRAY['por_validar'::character varying, 'validada'::character varying])::text[]))),
    CONSTRAINT empresas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['dependencia'::character varying, 'contratista'::character varying, 'supervision'::character varying])::text[])))
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: estimacion_fotos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimacion_fotos (
    id integer NOT NULL,
    estimacion_id integer NOT NULL,
    nombre text,
    descripcion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    mime text,
    tamano integer,
    contenido bytea,
    subido_por integer
);


--
-- Name: estimacion_fotos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estimacion_fotos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estimacion_fotos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estimacion_fotos_id_seq OWNED BY public.estimacion_fotos.id;


--
-- Name: estimacion_generadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimacion_generadores (
    id integer NOT NULL,
    estimacion_id integer NOT NULL,
    contrato_concepto_id integer NOT NULL,
    cantidad_periodo numeric(14,4) NOT NULL,
    cantidad_anterior_acum numeric(14,4) DEFAULT 0 NOT NULL,
    pu_snapshot numeric(16,4) NOT NULL,
    CONSTRAINT estimacion_generadores_cantidad_anterior_acum_check CHECK ((cantidad_anterior_acum >= (0)::numeric)),
    CONSTRAINT estimacion_generadores_cantidad_periodo_check CHECK ((cantidad_periodo > (0)::numeric)),
    CONSTRAINT estimacion_generadores_pu_snapshot_check CHECK ((pu_snapshot >= (0)::numeric))
);


--
-- Name: estimacion_generadores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estimacion_generadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estimacion_generadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estimacion_generadores_id_seq OWNED BY public.estimacion_generadores.id;


--
-- Name: estimacion_notas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimacion_notas (
    estimacion_id integer NOT NULL,
    nota_id integer NOT NULL
);


--
-- Name: estimacion_observaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimacion_observaciones (
    id integer NOT NULL,
    estimacion_id integer NOT NULL,
    seccion character varying(20) NOT NULL,
    tipo character varying(20) NOT NULL,
    severidad character varying(10) DEFAULT 'menor'::character varying NOT NULL,
    descripcion text NOT NULL,
    estado character varying(20) DEFAULT 'abierta'::character varying NOT NULL,
    turnado_a character varying(20),
    autor_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    solventada_en timestamp with time zone,
    CONSTRAINT estimacion_observaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['abierta'::character varying, 'solventada'::character varying])::text[]))),
    CONSTRAINT estimacion_observaciones_seccion_check CHECK (((seccion)::text = ANY ((ARRAY['caratula'::character varying, 'generadores'::character varying, 'fotos'::character varying, 'soportes'::character varying, 'notas'::character varying])::text[]))),
    CONSTRAINT estimacion_observaciones_severidad_check CHECK (((severidad)::text = ANY ((ARRAY['menor'::character varying, 'mayor'::character varying, 'critica'::character varying])::text[]))),
    CONSTRAINT estimacion_observaciones_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['aclaracion'::character varying, 'correccion'::character varying, 'rechazo'::character varying])::text[]))),
    CONSTRAINT estimacion_observaciones_turnado_a_check CHECK (((turnado_a IS NULL) OR ((turnado_a)::text = ANY ((ARRAY['supervision'::character varying, 'residencia'::character varying, 'contratista'::character varying])::text[]))))
);


--
-- Name: estimacion_observaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estimacion_observaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estimacion_observaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estimacion_observaciones_id_seq OWNED BY public.estimacion_observaciones.id;


--
-- Name: estimacion_soportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimacion_soportes (
    id integer NOT NULL,
    estimacion_id integer NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: estimacion_soportes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estimacion_soportes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estimacion_soportes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estimacion_soportes_id_seq OWNED BY public.estimacion_soportes.id;


--
-- Name: estimaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimaciones (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    numero integer NOT NULL,
    periodo_inicio date NOT NULL,
    periodo_fin date NOT NULL,
    estado character varying(20) DEFAULT 'integrada'::character varying NOT NULL,
    anticipo_pct_snapshot numeric(5,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    amortizacion numeric(14,2) NOT NULL,
    retencion numeric(14,2) NOT NULL,
    deductivas numeric(14,2) DEFAULT 0 NOT NULL,
    neto numeric(14,2) NOT NULL,
    integrada_por integer,
    integrada_en timestamp with time zone DEFAULT now() NOT NULL,
    enviada_en timestamp with time zone,
    enviada_por integer,
    reemplaza_a integer,
    retencion_atraso numeric(14,2) DEFAULT 0 NOT NULL,
    avance_fisico_pct numeric(7,4),
    avance_financiero_pct numeric(7,4),
    CONSTRAINT chk_estimaciones_anticipo CHECK (((anticipo_pct_snapshot >= (0)::numeric) AND (anticipo_pct_snapshot <= (100)::numeric))),
    CONSTRAINT chk_estimaciones_estado CHECK (((estado)::text = ANY ((ARRAY['integrada'::character varying, 'enviada'::character varying, 'autorizada'::character varying, 'pagada'::character varying, 'rechazada'::character varying])::text[]))),
    CONSTRAINT chk_estimaciones_montos CHECK (((subtotal >= (0)::numeric) AND (amortizacion >= (0)::numeric) AND (retencion >= (0)::numeric) AND (deductivas >= (0)::numeric))),
    CONSTRAINT chk_estimaciones_periodo CHECK ((periodo_fin >= periodo_inicio)),
    CONSTRAINT chk_estimaciones_retencion_atraso CHECK ((retencion_atraso >= (0)::numeric))
);


--
-- Name: estimaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estimaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estimaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estimaciones_id_seq OWNED BY public.estimaciones.id;


--
-- Name: finiquitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finiquitos (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    importe_neto_aprobado numeric(16,2) NOT NULL,
    total_pagado numeric(16,2) NOT NULL,
    anticipo_no_amortizado numeric(16,2) NOT NULL,
    ajustes_finales numeric(16,2) DEFAULT 0 NOT NULL,
    saldo numeric(16,2) NOT NULL,
    a_favor_de character varying(12) NOT NULL,
    importe_real_ejecutado numeric(16,2),
    observaciones text,
    nota_id integer,
    elaborado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_finiquitos_afavor CHECK (((a_favor_de)::text = ANY ((ARRAY['contratista'::character varying, 'dependencia'::character varying, 'ninguno'::character varying])::text[])))
);


--
-- Name: finiquitos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.finiquitos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: finiquitos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.finiquitos_id_seq OWNED BY public.finiquitos.id;


--
-- Name: garantia_endosos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.garantia_endosos (
    id integer NOT NULL,
    garantia_id integer NOT NULL,
    convenio_id integer,
    motivo character varying(30) DEFAULT 'otro'::character varying NOT NULL,
    nuevo_monto numeric(14,2),
    nueva_vigencia date,
    observaciones text,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT garantia_endosos_motivo_check CHECK (((motivo)::text = ANY ((ARRAY['ampliacion_monto'::character varying, 'prorroga_vigencia'::character varying, 'mixto'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT garantia_endosos_nuevo_monto_check CHECK (((nuevo_monto IS NULL) OR (nuevo_monto >= (0)::numeric)))
);


--
-- Name: garantia_endosos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.garantia_endosos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: garantia_endosos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.garantia_endosos_id_seq OWNED BY public.garantia_endosos.id;


--
-- Name: instruccion_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instruccion_pago (
    id integer NOT NULL,
    estimacion_id integer NOT NULL,
    presupuesto_anual_id integer,
    monto numeric(18,2),
    factura_cfdi character varying(60),
    soportes_ok boolean DEFAULT false NOT NULL,
    estado character varying(20) DEFAULT 'emitida'::character varying NOT NULL,
    fecha_instruccion date DEFAULT CURRENT_DATE NOT NULL,
    instruida_por integer,
    notificado_finanzas_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT instruccion_pago_estado_check CHECK (((estado)::text = ANY ((ARRAY['emitida'::character varying, 'notificada'::character varying, 'cumplida'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT instruccion_pago_monto_check CHECK (((monto IS NULL) OR (monto >= (0)::numeric)))
);


--
-- Name: instruccion_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.instruccion_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: instruccion_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.instruccion_pago_id_seq OWNED BY public.instruccion_pago.id;


--
-- Name: minutas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.minutas (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    lugar character varying(200),
    acuerdos text,
    nota_id integer,
    pdf_nombre text,
    pdf_mime character varying(100),
    pdf_tamano integer,
    pdf_contenido bytea,
    registrada_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    participantes text,
    CONSTRAINT minutas_pdf_tamano_check CHECK (((pdf_tamano IS NULL) OR (pdf_tamano >= 0)))
);


--
-- Name: minutas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.minutas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: minutas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.minutas_id_seq OWNED BY public.minutas.id;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    estimacion_id integer,
    estimacion_ref character varying(60) NOT NULL,
    fecha_pago date NOT NULL,
    importe numeric(14,2) NOT NULL,
    referencia character varying(100) NOT NULL,
    factura_cfdi character varying(60) NOT NULL,
    fecha_factura date NOT NULL,
    fecha_autorizacion date,
    observaciones text,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pagos_importe_check CHECK ((importe > (0)::numeric))
);


--
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- Name: plan_amortizacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_amortizacion (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    periodo_numero integer NOT NULL,
    monto numeric(18,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_amortizacion_monto_check CHECK ((monto >= (0)::numeric)),
    CONSTRAINT plan_amortizacion_periodo_numero_check CHECK ((periodo_numero > 0))
);


--
-- Name: plan_amortizacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_amortizacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_amortizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_amortizacion_id_seq OWNED BY public.plan_amortizacion.id;


--
-- Name: presupuesto_anual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuesto_anual (
    id integer NOT NULL,
    ejercicio integer NOT NULL,
    dependencia character varying(200) NOT NULL,
    partida character varying(60) NOT NULL,
    techo numeric(18,2) NOT NULL,
    descripcion text,
    creado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dependencia_id integer,
    CONSTRAINT presupuesto_anual_ejercicio_check CHECK (((ejercicio >= 2000) AND (ejercicio <= 2100))),
    CONSTRAINT presupuesto_anual_techo_check CHECK ((techo >= (0)::numeric))
);


--
-- Name: presupuesto_anual_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presupuesto_anual_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presupuesto_anual_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presupuesto_anual_id_seq OWNED BY public.presupuesto_anual.id;


--
-- Name: programa_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_obra (
    id integer NOT NULL,
    contrato_concepto_id integer NOT NULL,
    contrato_periodo_id integer NOT NULL,
    cantidad numeric(14,3) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT programa_obra_cantidad_check CHECK ((cantidad >= (0)::numeric))
);


--
-- Name: programa_obra_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_obra_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_obra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_obra_id_seq OWNED BY public.programa_obra.id;


--
-- Name: programa_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_version (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    numero integer NOT NULL,
    convenio_id integer,
    monto numeric(18,2),
    plazo_dias integer,
    vigente boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    supersedido_en timestamp with time zone
);


--
-- Name: programa_version_celda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_version_celda (
    id integer NOT NULL,
    programa_version_id integer NOT NULL,
    concepto_clave character varying(40),
    periodo_numero integer,
    periodo_inicio date,
    periodo_fin date,
    cantidad numeric(14,3)
);


--
-- Name: programa_version_celda_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_version_celda_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_version_celda_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_version_celda_id_seq OWNED BY public.programa_version_celda.id;


--
-- Name: programa_version_concepto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa_version_concepto (
    id integer NOT NULL,
    programa_version_id integer NOT NULL,
    clave character varying(40),
    concepto text,
    unidad character varying(20),
    cantidad numeric(14,3),
    pu numeric(16,4),
    orden integer
);


--
-- Name: programa_version_concepto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_version_concepto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_version_concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_version_concepto_id_seq OWNED BY public.programa_version_concepto.id;


--
-- Name: programa_version_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.programa_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: programa_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.programa_version_id_seq OWNED BY public.programa_version.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol public.rol_usuario,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    estado public.usuario_estado DEFAULT 'activo'::public.usuario_estado NOT NULL,
    rol_solicitado text,
    aprobado_por integer,
    aprobado_en timestamp with time zone,
    empresa_id integer
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: visitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitas (
    id integer NOT NULL,
    contrato_id integer NOT NULL,
    tipo character varying(20) DEFAULT 'visita'::character varying NOT NULL,
    fecha_programada date NOT NULL,
    fecha_realizada date,
    proposito text,
    resultado text,
    estado character varying(20) DEFAULT 'agendada'::character varying NOT NULL,
    registrada_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lugar text,
    responsable text,
    nota_id integer,
    CONSTRAINT visitas_estado_check CHECK (((estado)::text = ANY ((ARRAY['agendada'::character varying, 'realizada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT visitas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['visita'::character varying, 'inspeccion'::character varying])::text[])))
);


--
-- Name: visitas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visitas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visitas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visitas_id_seq OWNED BY public.visitas.id;


--
-- Name: alerta_atraso id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_atraso ALTER COLUMN id SET DEFAULT nextval('public.alerta_atraso_id_seq'::regclass);


--
-- Name: atraso_asentado id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atraso_asentado ALTER COLUMN id SET DEFAULT nextval('public.atraso_asentado_id_seq'::regclass);


--
-- Name: bitacora_aperturas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_aperturas ALTER COLUMN id SET DEFAULT nextval('public.bitacora_aperturas_id_seq'::regclass);


--
-- Name: bitacora_firmantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_firmantes ALTER COLUMN id SET DEFAULT nextval('public.bitacora_firmantes_id_seq'::regclass);


--
-- Name: bitacora_nota_firmas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_nota_firmas ALTER COLUMN id SET DEFAULT nextval('public.bitacora_nota_firmas_id_seq'::regclass);


--
-- Name: bitacora_notas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas ALTER COLUMN id SET DEFAULT nextval('public.bitacora_notas_id_seq'::regclass);


--
-- Name: concepto_avance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance ALTER COLUMN id SET DEFAULT nextval('public.concepto_avance_id_seq'::regclass);


--
-- Name: contrato_actividades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_actividades ALTER COLUMN id SET DEFAULT nextval('public.contrato_actividades_id_seq'::regclass);


--
-- Name: contrato_conceptos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_conceptos ALTER COLUMN id SET DEFAULT nextval('public.contrato_conceptos_id_seq'::regclass);


--
-- Name: contrato_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_documentos ALTER COLUMN id SET DEFAULT nextval('public.contrato_documentos_id_seq'::regclass);


--
-- Name: contrato_garantias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_garantias ALTER COLUMN id SET DEFAULT nextval('public.contrato_garantias_id_seq'::regclass);


--
-- Name: contrato_periodos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_periodos ALTER COLUMN id SET DEFAULT nextval('public.contrato_periodos_id_seq'::regclass);


--
-- Name: contrato_roster id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster ALTER COLUMN id SET DEFAULT nextval('public.contrato_roster_id_seq'::regclass);


--
-- Name: contratos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos ALTER COLUMN id SET DEFAULT nextval('public.contratos_id_seq'::regclass);


--
-- Name: convenios_modificatorios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios_modificatorios ALTER COLUMN id SET DEFAULT nextval('public.convenios_modificatorios_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: estimacion_fotos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_fotos ALTER COLUMN id SET DEFAULT nextval('public.estimacion_fotos_id_seq'::regclass);


--
-- Name: estimacion_generadores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_generadores ALTER COLUMN id SET DEFAULT nextval('public.estimacion_generadores_id_seq'::regclass);


--
-- Name: estimacion_observaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_observaciones ALTER COLUMN id SET DEFAULT nextval('public.estimacion_observaciones_id_seq'::regclass);


--
-- Name: estimacion_soportes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_soportes ALTER COLUMN id SET DEFAULT nextval('public.estimacion_soportes_id_seq'::regclass);


--
-- Name: estimaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones ALTER COLUMN id SET DEFAULT nextval('public.estimaciones_id_seq'::regclass);


--
-- Name: finiquitos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finiquitos ALTER COLUMN id SET DEFAULT nextval('public.finiquitos_id_seq'::regclass);


--
-- Name: garantia_endosos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia_endosos ALTER COLUMN id SET DEFAULT nextval('public.garantia_endosos_id_seq'::regclass);


--
-- Name: instruccion_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruccion_pago ALTER COLUMN id SET DEFAULT nextval('public.instruccion_pago_id_seq'::regclass);


--
-- Name: minutas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minutas ALTER COLUMN id SET DEFAULT nextval('public.minutas_id_seq'::regclass);


--
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- Name: plan_amortizacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amortizacion ALTER COLUMN id SET DEFAULT nextval('public.plan_amortizacion_id_seq'::regclass);


--
-- Name: presupuesto_anual id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_anual ALTER COLUMN id SET DEFAULT nextval('public.presupuesto_anual_id_seq'::regclass);


--
-- Name: programa_obra id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_obra ALTER COLUMN id SET DEFAULT nextval('public.programa_obra_id_seq'::regclass);


--
-- Name: programa_version id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version ALTER COLUMN id SET DEFAULT nextval('public.programa_version_id_seq'::regclass);


--
-- Name: programa_version_celda id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version_celda ALTER COLUMN id SET DEFAULT nextval('public.programa_version_celda_id_seq'::regclass);


--
-- Name: programa_version_concepto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version_concepto ALTER COLUMN id SET DEFAULT nextval('public.programa_version_concepto_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: visitas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas ALTER COLUMN id SET DEFAULT nextval('public.visitas_id_seq'::regclass);


--
-- Data for Name: alerta_atraso; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alerta_atraso (id, contrato_concepto_id, umbral_pct, canal, activa, creada_por, created_at) FROM stdin;
\.


--
-- Data for Name: atraso_asentado; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.atraso_asentado (id, contrato_concepto_id, periodo_numero, nota_id, asentado_por, created_at) FROM stdin;
1	74	3	24	35	2026-06-21 22:42:51.377618+00
2	75	3	36	35	2026-06-22 02:12:51.280283+00
\.


--
-- Data for Name: bitacora_aperturas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bitacora_aperturas (id, contrato_id, parte_1_firmante, parte_2_firmante, parte_3_firmante, fecha_apertura, created_at, apertura_en, acta, aperturada_por, plazo_firma_dias, domicilio_dependencia, telefono_dependencia, domicilio_contratista, telefono_contratista, descripcion_trabajos, caracteristicas_sitio) FROM stdin;
18	26	\N	\N	\N	2026-01-01	2026-06-21 22:13:09.184605+00	2026-06-21 22:13:09.184605+00	{"firmas": [{"correo": "chocovan392@gmail.com", "nombre": "ivan Lopez Garcia", "usuario_id": 35, "rol_en_firma": "residente"}, {"correo": "contratista@sigecop.test", "nombre": "Arq. Carlos Contratista Demo", "usuario_id": 2, "rol_en_firma": "superintendente"}, {"correo": "supervision@sigecop.test", "nombre": "Ing. Sofía Supervisión Demo", "usuario_id": 3, "rol_en_firma": "supervision"}], "objeto": "onstrucción de aula didáctica — campus UAGRO (prueba E2E final)", "ubicacion": "Av. Juárez s/n, Chilpancingo, Gro", "cronograma": {"fin": "2026-03-31T00:00:00.000Z", "inicio": "2026-01-01T00:00:00.000Z", "entrega_sitio": "2026-01-01"}, "identificacion": {"folio": "OBRA-2026-PRUEBA-FINAL", "contratista": "Arq. Carlos Contratista Demo", "dependencia": "Lic. Diana Dependencia Demo", "telefono_contratista": "7449876543", "telefono_dependencia": "7471234567", "domicilio_contratista": "Calle Reforma 25, Acapulco, Gro.", "domicilio_dependencia": "Av. Juárez 100, Chilpancingo, Gro."}, "datos_financieros": {"monto": "1000000.00", "plazo_dias": 90, "anticipo_pct": "30.00"}, "descripcion_trabajos": "Construcción de aula de 60 m²: cimentación, estructura y\\nacabados.", "caracteristicas_sitio": "Terreno plano, 200 m², acceso vehicular, suelo arcilloso."}	35	2	Av. Juárez 100, Chilpancingo, Gro.	7471234567	Calle Reforma 25, Acapulco, Gro.	7449876543	Construcción de aula de 60 m²: cimentación, estructura y\nacabados.	Terreno plano, 200 m², acceso vehicular, suelo arcilloso.
19	27	\N	\N	\N	2026-06-15	2026-06-22 02:00:33.366297+00	2026-06-22 02:00:33.366297+00	{"firmas": [{"correo": "chocovan392@gmail.com", "nombre": "ivan Lopez Garcia", "usuario_id": 35, "rol_en_firma": "residente"}, {"correo": "contratista@sigecop.test", "nombre": "Arq. Carlos Contratista Demo", "usuario_id": 2, "rol_en_firma": "superintendente"}, {"correo": "superv.norte@sigecop.test", "nombre": "Arq. Nadia Supervisión Norte", "usuario_id": 22, "rol_en_firma": "supervision"}], "objeto": "fsaadfs", "ubicacion": "dfsadfas", "cronograma": {"fin": "2029-03-10T00:00:00.000Z", "inicio": "2026-06-15T00:00:00.000Z", "entrega_sitio": "2026-06-21"}, "identificacion": {"folio": "saddsa", "contratista": "Arq. Carlos Contratista Demo", "dependencia": "Lic. Diana Dependencia Demo", "telefono_contratista": "43243", "telefono_dependencia": "43234", "domicilio_contratista": "dss", "domicilio_dependencia": "qwedas"}, "datos_financieros": {"monto": "158772.00", "plazo_dias": 1000, "anticipo_pct": "30.00"}, "descripcion_trabajos": "sdsa", "caracteristicas_sitio": "sddsa"}	35	2	qwedas	43234	dss	43243	sdsa	sddsa
20	30	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
21	31	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
22	32	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
23	33	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
24	34	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
25	36	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
26	37	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
27	38	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
28	39	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
29	40	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
30	41	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
31	42	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
32	43	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
33	44	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
34	45	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
35	46	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
36	47	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
37	48	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
38	49	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
39	50	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
40	51	\N	\N	\N	2026-04-23	2026-06-22 16:50:13.015179+00	2026-04-23 09:00:00+00	{}	1	2	\N	\N	\N	\N	Apertura de la bitácora electrónica de la obra.	\N
41	53	\N	\N	\N	2026-06-22	2026-06-22 21:30:41.806077+00	2026-06-22 21:30:41.806077+00	{"firmas": [{"correo": "chocovan392@gmail.com", "nombre": "ivan Lopez Garcia", "usuario_id": 35, "rol_en_firma": "residente"}, {"correo": "contratista@sigecop.test", "nombre": "Ing. Carlos Méndez Rivera", "usuario_id": 2, "rol_en_firma": "superintendente"}, {"correo": "supervision@sigecop.test", "nombre": "Arq. Mónica Vázquez Lara", "usuario_id": 3, "rol_en_firma": "supervision"}], "objeto": "alsdkjlasd", "ubicacion": "lkjadslsa", "cronograma": {"fin": "2026-07-01T00:00:00.000Z", "inicio": "2026-06-22T00:00:00.000Z", "entrega_sitio": "2026-06-22"}, "identificacion": {"folio": "kjahbdskdsa", "contratista": "Ing. Carlos Méndez Rivera", "dependencia": "Lic. Diana Dependencia Sur", "telefono_contratista": "gfddgf", "telefono_dependencia": "dgfdgf", "domicilio_contratista": "dgf", "domicilio_dependencia": "dgfgfd"}, "datos_financieros": {"monto": "27552.00", "plazo_dias": 10, "anticipo_pct": "30.00"}, "descripcion_trabajos": "gfddg", "caracteristicas_sitio": "dgfgfd"}	35	2	dgfgfd	dgfdgf	dgf	gfddgf	gfddg	dgfgfd
\.


--
-- Data for Name: bitacora_firmantes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bitacora_firmantes (id, bitacora_id, parte, titulo, firmante, cargo_label, cargo, correo, opcional, aplica, firmado, firmado_en, created_at, usuario_id, rol_en_firma) FROM stdin;
52	18	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-21 22:13:56.421897+00	2026-06-21 22:13:09.184605+00	35	residente
53	18	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-21 22:14:12.830406+00	2026-06-21 22:13:09.184605+00	2	superintendente
54	18	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-21 22:15:11.559164+00	2026-06-21 22:13:09.184605+00	3	supervision
56	19	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-22 02:01:41.671976+00	2026-06-22 02:00:33.366297+00	2	superintendente
57	19	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-22 02:06:44.584057+00	2026-06-22 02:00:33.366297+00	22	supervision
55	19	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-22 02:06:55.807322+00	2026-06-22 02:00:33.366297+00	35	residente
58	20	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
59	20	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
60	20	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
61	21	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
62	21	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
63	21	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
64	22	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
65	22	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
66	22	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
67	23	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
68	23	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
69	23	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
70	24	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
71	24	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
72	24	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
73	25	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
74	25	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
75	25	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
76	26	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
77	26	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
78	26	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
79	27	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
80	27	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
81	27	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
82	28	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
83	28	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
84	28	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
85	29	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
86	29	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
87	29	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
88	30	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
89	30	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
90	30	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
91	31	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
92	31	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
93	31	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
94	32	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
95	32	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
96	32	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
97	33	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
98	33	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
99	33	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
100	34	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
101	34	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
102	34	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
103	35	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
104	35	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
105	35	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
106	36	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
107	36	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
108	36	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
109	37	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
110	37	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
111	37	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
112	38	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	f	\N	2026-06-22 16:50:13.015179+00	1	residente
115	39	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	f	\N	2026-06-22 16:50:13.015179+00	1	residente
118	40	1	\N	Ing. Roberto Salazar Gómez	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	residente
119	40	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	2	superintendente
120	40	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	3	supervision
122	41	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-22 21:31:03.925782+00	2026-06-22 21:30:41.806077+00	2	superintendente
113	38	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-06-22 21:31:04.61366+00	2026-06-22 16:50:13.015179+00	2	superintendente
116	39	2	\N	Ing. Carlos Méndez Rivera	\N	\N	\N	f	t	t	2026-06-22 21:31:05.229773+00	2026-06-22 16:50:13.015179+00	2	superintendente
123	41	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-22 21:31:13.81498+00	2026-06-22 21:30:41.806077+00	3	supervision
114	38	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-06-22 21:31:14.624812+00	2026-06-22 16:50:13.015179+00	3	supervision
117	39	3	\N	Arq. Mónica Vázquez Lara	\N	\N	\N	f	t	t	2026-06-22 21:31:14.978272+00	2026-06-22 16:50:13.015179+00	3	supervision
121	41	\N	\N	\N	\N	\N	\N	f	t	t	2026-06-22 21:31:22.431217+00	2026-06-22 21:30:41.806077+00	35	residente
\.


--
-- Data for Name: bitacora_nota_firmas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bitacora_nota_firmas (id, nota_id, usuario_id, rol_en_firma, firmado_en) FROM stdin;
55	21	2	superintendente	2026-06-21 22:22:39.374267+00
56	21	35	residente	2026-06-21 22:24:00.266857+00
57	24	2	superintendente	2026-06-21 22:47:44.069227+00
58	22	3	supervision	2026-06-21 22:48:14.43063+00
59	23	3	supervision	2026-06-21 22:48:17.78454+00
60	24	3	supervision	2026-06-21 22:48:23.219743+00
61	29	35	residente	2026-06-21 23:28:55.55265+00
62	38	1	residente	2026-06-22 16:50:13.015179+00
63	38	2	superintendente	2026-06-22 16:50:13.015179+00
64	38	3	supervision	2026-06-22 16:50:13.015179+00
65	39	1	residente	2026-06-22 16:50:13.015179+00
66	39	2	superintendente	2026-06-22 16:50:13.015179+00
67	39	3	supervision	2026-06-22 16:50:13.015179+00
68	40	1	residente	2026-06-22 16:50:13.015179+00
69	40	2	superintendente	2026-06-22 16:50:13.015179+00
70	40	3	supervision	2026-06-22 16:50:13.015179+00
71	41	1	residente	2026-06-22 16:50:13.015179+00
72	41	2	superintendente	2026-06-22 16:50:13.015179+00
73	41	3	supervision	2026-06-22 16:50:13.015179+00
74	42	1	residente	2026-06-22 16:50:13.015179+00
75	42	2	superintendente	2026-06-22 16:50:13.015179+00
76	42	3	supervision	2026-06-22 16:50:13.015179+00
77	43	1	residente	2026-06-22 16:50:13.015179+00
78	43	2	superintendente	2026-06-22 16:50:13.015179+00
79	43	3	supervision	2026-06-22 16:50:13.015179+00
80	44	1	residente	2026-06-22 16:50:13.015179+00
81	44	2	superintendente	2026-06-22 16:50:13.015179+00
82	44	3	supervision	2026-06-22 16:50:13.015179+00
83	45	1	residente	2026-06-22 16:50:13.015179+00
84	45	2	superintendente	2026-06-22 16:50:13.015179+00
85	45	3	supervision	2026-06-22 16:50:13.015179+00
86	46	1	residente	2026-06-22 16:50:13.015179+00
87	46	2	superintendente	2026-06-22 16:50:13.015179+00
88	46	3	supervision	2026-06-22 16:50:13.015179+00
89	47	1	residente	2026-06-22 16:50:13.015179+00
90	47	2	superintendente	2026-06-22 16:50:13.015179+00
91	47	3	supervision	2026-06-22 16:50:13.015179+00
92	48	1	residente	2026-06-22 16:50:13.015179+00
93	48	2	superintendente	2026-06-22 16:50:13.015179+00
94	48	3	supervision	2026-06-22 16:50:13.015179+00
95	49	1	residente	2026-06-22 16:50:13.015179+00
96	49	2	superintendente	2026-06-22 16:50:13.015179+00
97	49	3	supervision	2026-06-22 16:50:13.015179+00
98	50	1	residente	2026-06-22 16:50:13.015179+00
99	50	2	superintendente	2026-06-22 16:50:13.015179+00
100	50	3	supervision	2026-06-22 16:50:13.015179+00
101	51	1	residente	2026-06-22 16:50:13.015179+00
102	51	2	superintendente	2026-06-22 16:50:13.015179+00
103	51	3	supervision	2026-06-22 16:50:13.015179+00
104	52	1	residente	2026-06-22 16:50:13.015179+00
105	52	2	superintendente	2026-06-22 16:50:13.015179+00
106	52	3	supervision	2026-06-22 16:50:13.015179+00
107	53	1	residente	2026-06-22 16:50:13.015179+00
108	53	2	superintendente	2026-06-22 16:50:13.015179+00
109	53	3	supervision	2026-06-22 16:50:13.015179+00
110	54	1	residente	2026-06-22 16:50:13.015179+00
111	54	2	superintendente	2026-06-22 16:50:13.015179+00
112	54	3	supervision	2026-06-22 16:50:13.015179+00
113	55	1	residente	2026-06-22 16:50:13.015179+00
114	55	2	superintendente	2026-06-22 16:50:13.015179+00
115	55	3	supervision	2026-06-22 16:50:13.015179+00
116	56	1	residente	2026-06-22 16:50:13.015179+00
117	56	2	superintendente	2026-06-22 16:50:13.015179+00
118	56	3	supervision	2026-06-22 16:50:13.015179+00
119	57	1	residente	2026-06-22 16:50:13.015179+00
120	57	2	superintendente	2026-06-22 16:50:13.015179+00
121	57	3	supervision	2026-06-22 16:50:13.015179+00
122	58	1	residente	2026-06-22 16:50:13.015179+00
123	58	2	superintendente	2026-06-22 16:50:13.015179+00
124	58	3	supervision	2026-06-22 16:50:13.015179+00
125	59	1	residente	2026-06-22 16:50:13.015179+00
126	59	2	superintendente	2026-06-22 16:50:13.015179+00
127	59	3	supervision	2026-06-22 16:50:13.015179+00
128	60	1	residente	2026-06-22 16:50:13.015179+00
129	60	2	superintendente	2026-06-22 16:50:13.015179+00
130	60	3	supervision	2026-06-22 16:50:13.015179+00
131	61	1	residente	2026-06-22 16:50:13.015179+00
132	61	2	superintendente	2026-06-22 16:50:13.015179+00
133	61	3	supervision	2026-06-22 16:50:13.015179+00
134	62	1	residente	2026-06-22 16:50:13.015179+00
135	62	2	superintendente	2026-06-22 16:50:13.015179+00
136	62	3	supervision	2026-06-22 16:50:13.015179+00
137	63	1	residente	2026-06-22 16:50:13.015179+00
138	63	2	superintendente	2026-06-22 16:50:13.015179+00
139	63	3	supervision	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: bitacora_nota_tipos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bitacora_nota_tipos (clave, etiqueta, rol_emisor, orden, activo) FROM stdin;
res_modificaciones	Autorización de modificaciones (proyecto ejecutivo, procedimiento, calidad, programa)	residente	101	t
res_estimaciones	Autorización de estimaciones	residente	102	t
res_ajuste_costos	Aprobación de ajuste de costos	residente	103	t
res_conceptos_extra	Aprobación de conceptos no previstos y cantidades adicionales	residente	104	t
res_convenios	Autorización de convenios modificatorios	residente	105	t
res_terminacion_rescision	Terminación anticipada o rescisión administrativa del contrato	residente	106	t
res_sustitucion	Sustitución del superintendente, del residente anterior o de la supervisión	residente	107	t
res_suspension	Suspensión de trabajos	residente	108	t
res_conciliacion	Conciliaciones y, en su caso, convenios respectivos	residente	109	t
res_caso_fortuito	Caso fortuito o fuerza mayor que afecta el programa de ejecución	residente	110	t
res_terminacion	Terminación de los trabajos	residente	111	t
sup_modificaciones	Solicitud de modificaciones (proyecto ejecutivo, procedimiento, calidad, programa)	superintendente	201	t
sup_estimaciones	Solicitud de aprobación de estimaciones	superintendente	202	t
sup_falta_pago	Falta o atraso en el pago de estimaciones	superintendente	203	t
sup_ajuste_costos	Solicitud de ajuste de costos	superintendente	204	t
sup_conceptos_extra	Solicitud de conceptos no previstos y cantidades adicionales	superintendente	205	t
sup_convenios	Solicitud de convenios modificatorios	superintendente	206	t
sup_aviso_terminacion	Aviso de terminación de los trabajos	superintendente	207	t
atraso	Atraso de obra respecto del programa de ejecución	residente	112	t
finiquito	Finiquito y cierre del contrato (art. 64 LOPSRM)	residente	0	t
autorizacion	Autorización (modificaciones, estimaciones, convenios)	residente	10	f
aprobacion	Aprobación (ajuste de costos, conceptos/cantidades adicionales)	residente	20	f
solicitud	Solicitud (modificaciones, estimaciones, ajuste de costos)	superintendente	50	f
aviso	Aviso (terminación de trabajos, atraso de pagos)	superintendente	60	f
avance	Avance físico y financiero	supervision	301	t
calidad	Resultado de pruebas de calidad	supervision	302	t
seguridad	Seguridad, higiene y protección al ambiente	supervision	303	t
junta	Acuerdos de juntas de trabajo	supervision	304	t
apertura	Apertura de bitácora	residente	400	t
cierre	Cierre de bitácora	residente	401	t
otro	Otro (evento no tipificado)	\N	999	t
\.


--
-- Data for Name: bitacora_notas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bitacora_notas (id, bitacora_id, tipo, contenido, emisor_id, fecha, created_at, numero, asunto, vinculada_a, estado, firmado_en, tag) FROM stdin;
20	18	apertura	Se levanta la presente acta de apertura de la bitácora del contrato OBRA-2026-PRUEBA-FINAL, cuyo objeto es: onstrucción de aula didáctica — campus UAGRO (prueba E2E final), ubicada en Av. Juárez s/n, Chilpancingo, Gro. El contrato se celebra entre Lic. Diana Dependencia Demo (dependencia contratante) y Arq. Carlos Contratista Demo (contratista / superintendente), por un monto contractual de $1,000,000.00 con un anticipo del 30%, con un plazo de ejecución de 90 días naturales, del 2026-01-01 al 2026-03-31; la entrega del sitio se realiza el 2026-01-01. Se asientan los datos mínimos del art. 123 fr. III RLOPSRM (domicilios y teléfonos de las partes, descripción de los trabajos y características del sitio), que constan en el acta. Esta es la primera nota de la bitácora (art. 123 fr. III RLOPSRM) y vincula a las partes (art. 46 LOPSRM).	35	2026-06-21 22:13:09.184605+00	2026-06-21 22:13:09.184605+00	1	Nota de apertura de bitácora	\N	emitida	\N	\N
21	18	avance	Se verifica avance de excavación conforme a programa.	3	2026-06-21 22:19:53.827311+00	2026-06-21 22:19:53.827311+00	2	Verificación de avance	\N	emitida	2026-06-21 22:19:53.827311+00	avance
22	18	avance	Avance de trabajos — Limpieza y trazo del terreno: se ejecutaron 1,000 m² en el periodo 1, conforme al programa de obra. (art. 125 fr. II RLOPSRM; asiento automático del sistema.)	2	2026-06-21 22:37:14.433748+00	2026-06-21 22:37:14.433748+00	3	Avance de trabajos — Limpieza y trazo del terreno	\N	emitida	2026-06-21 22:37:14.433748+00	avance
23	18	avance	Avance de trabajos — Excavación a máquina: se ejecutaron 250 m³ en el periodo 1, conforme al programa de obra. (art. 125 fr. II RLOPSRM; asiento automático del sistema.)	2	2026-06-21 22:37:26.029152+00	2026-06-21 22:37:26.029152+00	4	Avance de trabajos — Excavación a máquina	\N	emitida	2026-06-21 22:37:26.029152+00	avance
25	18	sup_estimaciones	Solicitud de aprobación de la estimación No. 1 del periodo Thu Jan 01 a Sat Jan 31. (art. 125 fr. II-b RLOPSRM; asiento automático del sistema al presentar la estimación.)	2	2026-06-21 22:52:15.047458+00	2026-06-21 22:52:15.047458+00	6	Solicitud de aprobación de la estimación No. 1	\N	emitida	2026-06-21 22:52:15.047458+00	estimacion
26	18	sup_estimaciones	Solicitud de aprobación de la estimación No. 2 del periodo Thu Jan 01 a Sat Jan 31. (art. 125 fr. II-b RLOPSRM; asiento automático del sistema al presentar la estimación.)	2	2026-06-21 22:58:30.548596+00	2026-06-21 22:58:30.548596+00	7	Solicitud de aprobación de la estimación No. 2	\N	emitida	2026-06-21 22:58:30.548596+00	estimacion
27	18	res_estimaciones	Autorización de la estimación No. 2 del periodo Thu Jan 01 a Sat Jan 31, por la residencia. (art. 125 fr. I-b RLOPSRM; asiento automático del sistema al autorizar la estimación.)	35	2026-06-21 22:59:16.021558+00	2026-06-21 22:59:16.021558+00	8	Autorización de la estimación No. 2	\N	emitida	2026-06-21 22:59:16.021558+00	estimacion
28	18	res_convenios	Convenio modificatorio CM-001: plazo; variación 11.11% sobre plazo. Motivo: Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM). (art. 59 LOPSRM / art. 99, 123 fr. XI RLOPSRM; asiento automático del sistema.)	35	2026-06-21 23:15:24.033655+00	2026-06-21 23:15:24.033655+00	9	Convenio modificatorio CM-001 (plazo)	\N	emitida	2026-06-21 23:15:24.033655+00	convenio
29	18	res_sustitucion	Se sustituye a Arq. Carlos Contratista Demo como superintendente del contrato. Motivo del cambio: Cambio de superintendente (art. 125 fr. I g RLOPSRM).. Entra Ing. Marco Superintendente 2 a partir del 21 de junio de 2026. (art. 125 fr. I inciso g RLOPSRM; asiento automático del sistema.)	4	2026-06-21 23:26:29.658448+00	2026-06-21 23:26:29.658448+00	10	Sustitución de superintendente: Arq. Carlos Contratista Demo → Ing. Marco Superintendente 2	\N	emitida	2026-06-21 23:26:29.658448+00	sustitucion
30	18	finiquito	Se elabora el finiquito del contrato OBRA-2026-PRUEBA-FINAL (art. 64 LOPSRM / arts. 168-172 RLOPSRM). Importe real ejecutado: $100,000.00. Importe neto estimado y autorizado: $69,500.00. Total pagado: $69,500.00. Anticipo no amortizado: $270,000.00. Saldo resultante: -$270,000.00 — saldo a FAVOR DE LA DEPENDENCIA por $270,000.00 (el contratista reintegra, art. 171). Con la firma del finiquito se da por terminado el contrato y se extinguen los derechos y obligaciones de las partes (art. 172 RLOPSRM).	35	2026-06-21 23:35:00.643118+00	2026-06-21 23:35:00.643118+00	11	Finiquito y cierre del contrato OBRA-2026-PRUEBA-FINAL	\N	emitida	2026-06-21 23:35:00.643118+00	finiquito
31	18	otro	bjb	35	2026-06-21 23:35:49.077967+00	2026-06-21 23:35:49.077967+00	12	hjbjk	\N	emitida	2026-06-21 23:35:49.077967+00	\N
32	19	apertura	Se levanta la presente acta de apertura de la bitácora del contrato saddsa, cuyo objeto es: fsaadfs, ubicada en dfsadfas. El contrato se celebra entre Lic. Diana Dependencia Demo (dependencia contratante) y Arq. Carlos Contratista Demo (contratista / superintendente), por un monto contractual de $158,772.00 con un anticipo del 30%, con un plazo de ejecución de 1000 días naturales, del 2026-06-15 al 2029-03-10; la entrega del sitio se realiza el 2026-06-21. Se asientan los datos mínimos del art. 123 fr. III RLOPSRM (domicilios y teléfonos de las partes, descripción de los trabajos y características del sitio), que constan en el acta. Esta es la primera nota de la bitácora (art. 123 fr. III RLOPSRM) y vincula a las partes (art. 46 LOPSRM).	35	2026-06-22 02:00:33.366297+00	2026-06-22 02:00:33.366297+00	1	Nota de apertura de bitácora	\N	emitida	\N	\N
33	19	avance	Avance de trabajos — ads: se ejecutaron 524 m³ en el periodo 2, conforme al programa de obra. Registrado antes de abrir la bitácora; asentado al abrirla. (art. 125 fr. II RLOPSRM; asiento automático del sistema.)	35	2026-06-22 02:00:33.366297+00	2026-06-22 02:00:33.366297+00	2	Avance de trabajos — ads	\N	emitida	2026-06-22 02:00:33.366297+00	avance
34	19	avance	Avance de trabajos — hgfh: se ejecutaron 524 cm en el periodo 3, conforme al programa de obra. Registrado antes de abrir la bitácora; asentado al abrirla. (art. 125 fr. II RLOPSRM; asiento automático del sistema.)	35	2026-06-22 02:00:33.366297+00	2026-06-22 02:00:33.366297+00	3	Avance de trabajos — hgfh	\N	emitida	2026-06-22 02:00:33.366297+00	avance
35	19	res_convenios	Convenio modificatorio CM-001: mixto; variación 907.69% sobre monto y 1011.11% sobre plazo. Motivo: sfddsf. Registrado antes de abrir la bitácora; asentado al abrirla. (art. 59 LOPSRM / art. 99, 123 fr. XI RLOPSRM; asiento automático del sistema.)	35	2026-06-22 02:00:33.366297+00	2026-06-22 02:00:33.366297+00	4	Convenio modificatorio CM-001 (mixto)	\N	emitida	2026-06-22 02:00:33.366297+00	convenio
36	18	atraso	Atraso registrado — Concreto f’c=200 kg/cm²: déficit de 300 m³ respecto del programa al periodo 3. El déficit es lo programado acumulado al periodo vigente menos lo ejecutado acumulado, en unidades del concepto (LOPSRM art. 52; RLOPSRM art. 45 ap. A fr. X). Asiento del sistema (art. 123 RLOPSRM).	35	2026-06-22 02:12:51.280283+00	2026-06-22 02:12:51.280283+00	13	Atraso de obra — Concreto f’c=200 kg/cm²	\N	emitida	2026-06-22 02:12:51.280283+00	atraso
24	18	atraso	Atraso registrado — Excavación a máquina: déficit de 250 m³ respecto del programa al periodo 3. El déficit es lo programado acumulado al periodo vigente menos lo ejecutado acumulado, en unidades del concepto (LOPSRM art. 52; RLOPSRM art. 45 ap. A fr. X). Asiento del sistema (art. 123 RLOPSRM).	35	2026-06-21 22:42:51.377618+00	2026-06-21 22:42:51.377618+00	5	Atraso de obra — Excavación a máquina	\N	anulada	2026-06-21 22:42:51.377618+00	atraso
37	18	atraso	ijghubhb	35	2026-06-22 02:24:09.390338+00	2026-06-22 02:24:09.390338+00	14	Corrección (dice/debe decir) de la nota #5	24	emitida	2026-06-22 02:24:09.390338+00	\N
38	20	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
39	20	res_convenios	Convenio modificatorio de monto: se incrementa el volumen de terracerías (CONC-01) por condiciones del terreno (art. 59 LOPSRM).	1	2026-06-17 00:00:00+00	2026-06-22 16:50:13.015179+00	2	\N	\N	emitida	\N	convenio
40	21	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
41	22	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
42	23	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
43	24	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
44	25	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
45	25	avance	Se concluye la terracería de CONC-01 al 100%; inicia cimentación.	3	2026-05-13 00:00:00+00	2026-06-22 16:50:13.015179+00	2	\N	\N	emitida	\N	avance
46	25	aviso	Se solicita a la residencia la revisión del nivel de desplante por hallazgo de roca.	2	2026-05-23 00:00:00+00	2026-06-22 16:50:13.015179+00	3	\N	\N	emitida	\N	\N
47	25	calidad	Prueba de laboratorio del concreto f'c=250: resultado conforme.	3	2026-06-02 00:00:00+00	2026-06-22 16:50:13.015179+00	4	\N	\N	emitida	\N	\N
48	26	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
49	26	avance	Avance de cimentación al 60%; sin incidencias.	3	2026-05-28 00:00:00+00	2026-06-22 16:50:13.015179+00	2	\N	\N	emitida	\N	avance
50	26	junta	Minuta de junta de obra: se acuerda reforzar el frente de cimentación.	3	2026-06-04 00:00:00+00	2026-06-22 16:50:13.015179+00	3	\N	\N	emitida	\N	\N
51	27	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
52	28	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
53	29	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
54	30	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
55	31	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
56	32	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
57	33	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
58	34	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
59	35	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
60	36	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
61	37	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
62	40	apertura	Apertura de bitácora electrónica de la obra.	1	2026-04-23 09:30:00+00	2026-06-22 16:50:13.015179+00	1	\N	\N	emitida	\N	\N
63	40	finiquito	Finiquito de los trabajos: saldo conciliado y cierre del contrato (art. 64 LOPSRM / 170 RLOPSRM).	1	2026-06-22 00:00:00+00	2026-06-22 16:50:13.015179+00	2	\N	\N	emitida	\N	finiquito
64	41	apertura	Se levanta la presente acta de apertura de la bitácora del contrato kjahbdskdsa, cuyo objeto es: alsdkjlasd, ubicada en lkjadslsa. El contrato se celebra entre Lic. Diana Dependencia Sur (dependencia contratante) y Ing. Carlos Méndez Rivera (contratista / superintendente), por un monto contractual de $27,552.00 con un anticipo del 30%, con un plazo de ejecución de 10 días naturales, del 2026-06-22 al 2026-07-01; la entrega del sitio se realiza el 2026-06-22. Se asientan los datos mínimos del art. 123 fr. III RLOPSRM (domicilios y teléfonos de las partes, descripción de los trabajos y características del sitio), que constan en el acta. Esta es la primera nota de la bitácora (art. 123 fr. III RLOPSRM) y vincula a las partes (art. 46 LOPSRM).	35	2026-06-22 21:30:41.806077+00	2026-06-22 21:30:41.806077+00	1	Nota de apertura de bitácora	\N	emitida	\N	\N
65	41	avance	Avance de trabajos — sad: se ejecutaron 300 m² en el periodo 1, conforme al programa de obra. (art. 125 fr. II RLOPSRM; asiento automático del sistema.)	2	2026-06-22 21:33:02.314849+00	2026-06-22 21:33:02.314849+00	2	Avance de trabajos — sad	\N	emitida	2026-06-22 21:33:02.314849+00	avance
66	41	avance	Corrección del avance del periodo 1 en "sad": dice 300.000 m², debe decir 200 m². (art. 123 fr. VI/VII RLOPSRM: la entrada original se anula y se registra esta corrección vinculada; no se sobrescribe.)	2	2026-06-22 21:34:41.899074+00	2026-06-22 21:34:41.899074+00	3	Corrección de avance — sad	\N	emitida	2026-06-22 21:34:41.899074+00	correccion
67	19	sup_estimaciones	Solicitud de aprobación de la estimación No. 1 del periodo Mon Jun 15 a Tue Jul 14. (art. 125 fr. II-b RLOPSRM; asiento automático del sistema al presentar la estimación.)	2	2026-06-22 22:12:30.168387+00	2026-06-22 22:12:30.168387+00	5	Solicitud de aprobación de la estimación No. 1	\N	emitida	2026-06-22 22:12:30.168387+00	estimacion
68	19	res_estimaciones	Autorización de la estimación No. 1 del periodo Mon Jun 15 a Tue Jul 14, por la residencia. (art. 125 fr. I-b RLOPSRM; asiento automático del sistema al autorizar la estimación.)	35	2026-06-23 00:05:31.008511+00	2026-06-23 00:05:31.008511+00	6	Autorización de la estimación No. 1	\N	emitida	2026-06-23 00:05:31.008511+00	estimacion
\.


--
-- Data for Name: concepto_avance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.concepto_avance (id, contrato_concepto_id, contrato_periodo_id, nota_id, cantidad, fecha, observaciones, registrado_por, created_at, estado, reemplaza_a, anulada_por, anulada_en) FROM stdin;
24	73	73	22	1000.000	2026-01-31	Avance físico P1 verificado en sitio (E2E)	2	2026-06-21 22:37:14.433748+00	vigente	\N	\N	\N
25	74	73	23	250.000	2026-01-31	\N	2	2026-06-21 22:37:26.029152+00	vigente	\N	\N	\N
26	77	77	33	524.000	2026-08-14	\N	2	2026-06-22 01:55:14.239729+00	vigente	\N	\N	\N
27	78	78	34	524.000	2026-09-12	\N	2	2026-06-22 01:58:13.668496+00	vigente	\N	\N	\N
28	88	88	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
29	91	91	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
30	92	92	\N	150.000	2026-06-21	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
31	94	94	\N	500.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
32	97	97	\N	150.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
33	112	112	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
34	115	115	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
35	118	118	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
36	119	119	\N	200.000	2026-06-21	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
37	120	120	\N	1.000	2026-06-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
38	121	121	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
39	124	124	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
40	127	127	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
41	128	128	\N	200.000	2026-06-21	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
42	130	130	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
43	131	131	\N	180.000	2026-06-21	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
44	133	133	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
45	136	136	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
46	139	139	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
47	148	148	\N	1000.000	2026-05-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
48	149	149	\N	200.000	2026-06-21	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
49	150	150	\N	1.000	2026-06-22	\N	2	2026-06-22 16:50:13.015179+00	vigente	\N	\N	\N
50	151	151	65	300.000	2026-07-01	en esta fecha el frente de obra a completado la construccion de 300 metros cuadrados	2	2026-06-22 21:33:02.314849+00	anulada	\N	2	2026-06-22 21:34:41.899074+00
51	151	151	66	200.000	2026-07-01	en esta fecha el frente de obra a completado la construccion de 300 metros cuadrados	2	2026-06-22 21:34:41.899074+00	vigente	50	\N	\N
\.


--
-- Data for Name: contrato_actividades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_actividades (id, contrato_id, orden, actividad, inicio, termino, peso, created_at) FROM stdin;
\.


--
-- Data for Name: contrato_conceptos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_conceptos (id, contrato_id, orden, concepto, unidad, cantidad, pu, created_at, clave) FROM stdin;
151	53	1	sad	m²	1312.000	21.0000	2026-06-22 17:05:53.683791+00	sad
73	26	1	Limpieza y trazo del terreno	m²	1000.000	50.0000	2026-06-21 21:53:40.071664+00	C-01
74	26	2	Excavación a máquina	m³	500.000	200.0000	2026-06-21 21:53:40.071664+00	C-02
75	26	3	Concreto f’c=200 kg/cm²	m³	300.000	2500.0000	2026-06-21 21:53:40.071664+00	C-03
76	26	4	Acero de refuerzo fy=4200	kg	2000.000	50.0000	2026-06-21 21:53:40.071664+00	C-04
77	27	1	ads	m³	524.000	45.0000	2026-06-22 01:11:01.623717+00	dsa
78	27	2	hgfh	cm	524.000	258.0000	2026-06-22 01:11:01.623717+00	dsf
79	28	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
80	28	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
81	28	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
82	29	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
83	29	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
84	29	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
86	30	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
87	30	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
85	30	1	Terracerías y movimiento de tierras	m3	1200.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
88	31	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
89	31	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
90	31	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
91	32	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
92	32	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
93	32	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
94	33	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
95	33	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
96	33	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
97	34	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
98	34	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
99	34	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
100	35	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
101	35	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
102	35	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
103	36	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
104	36	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
105	36	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
106	37	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
107	37	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
108	37	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
109	38	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
110	38	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
111	38	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
112	39	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
113	39	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
114	39	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
115	40	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
116	40	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
117	40	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
118	41	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
119	41	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
120	41	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
121	42	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
122	42	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
123	42	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
124	43	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
125	43	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
126	43	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
127	44	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
128	44	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
129	44	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
130	45	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
131	45	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
132	45	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
133	46	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
134	46	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
135	46	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
136	47	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
137	47	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
138	47	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
139	48	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
140	48	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
141	48	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
142	49	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
143	49	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
144	49	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
145	50	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
146	50	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
147	50	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
148	51	1	Terracerías y movimiento de tierras	m3	1000.000	300.0000	2026-06-22 16:50:13.015179+00	CONC-01
149	51	2	Cimentación	m3	200.000	1500.0000	2026-06-22 16:50:13.015179+00	CONC-02
150	51	3	Estructura y obra negra	lote	1.000	400000.0000	2026-06-22 16:50:13.015179+00	CONC-03
\.


--
-- Data for Name: contrato_documentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_documentos (id, contrato_id, nombre, mime, tamano, contenido, subido_en, tipo, convenio_id) FROM stdin;
1	26	observaciones_EST-002_OBRA-2026-PRUEBA-FINAL_2026-06-18.pdf	application/pdf	4089	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313035330a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203738352e313937303836363134313733323538362054640a284f62736572766163696f6e6573206465206c612076657273696f6e2072656368617a6164612920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203736322e353139393231323539383432343736352054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203734352e353132303437323434303934343436382054640a28457374696d6163696f6e3a204553542d303032205c2876657273696f6e2072656368617a6164615c292920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203732382e353034313733323238333436343137312054640a2846656368612064652064657363617267613a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203639342e343838343235313936383530333537372054640a2823207c2053656363696f6e207c205469706f207c20536576657269646164207c204f62736572766163696f6e2920546a0a45540a302e373120470a33392e36383530333933373030373837343037203638332e31343938343235313936383439363636206d0a3535352e35393035353131383131303234353533203638332e31343938343235313936383439363636206c0a530a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203636362e313431393638353033393336393336392054640a28312e205b4d656e6f725d20436172e174756c6120b72041636c6172616369f36e3a205475726e6164612061207265736964656e6369612073696e206f62736572766163696f6e657320646520737570657276697369f36e2e2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28322e205b4d61796f725d20436172e174756c6120b72052656368617a6f3a2046616c74616e20736f706f7274657320646520432d30333b20726563617074757261722920546a0a542a202867656e657261646f7265732e2920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030303631332d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303031323537203030303030206e200a30303030303033303734203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303031333134203030303030206e200a30303030303031343339203030303030206e200a30303030303031353639203030303030206e200a30303030303031373032203030303030206e200a30303030303031383339203030303030206e200a30303030303031393632203030303030206e200a30303030303032303931203030303030206e200a30303030303032323233203030303030206e200a30303030303032333539203030303030206e200a30303030303032343837203030303030206e200a30303030303032363134203030303030206e200a30303030303032373433203030303030206e200a30303030303032383736203030303030206e200a30303030303032393738203030303030206e200a30303030303033333232203030303030206e200a30303030303033343038203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c31374637313839464334413238344333323938383930363637373246324445303e203c31374637313839464334413238344333323938383930363637373246324445303e205d0a3e3e0a7374617274787265660a333531320a2525454f46	2026-06-21 21:53:40.569296+00	contrato	\N
2	27	observaciones_EST-002_OBRA-2026-PRUEBA-FINAL_2026-06-18.pdf	application/pdf	4089	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313035330a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203738352e313937303836363134313733323538362054640a284f62736572766163696f6e6573206465206c612076657273696f6e2072656368617a6164612920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203736322e353139393231323539383432343736352054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203734352e353132303437323434303934343436382054640a28457374696d6163696f6e3a204553542d303032205c2876657273696f6e2072656368617a6164615c292920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203732382e353034313733323238333436343137312054640a2846656368612064652064657363617267613a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203639342e343838343235313936383530333537372054640a2823207c2053656363696f6e207c205469706f207c20536576657269646164207c204f62736572766163696f6e2920546a0a45540a302e373120470a33392e36383530333933373030373837343037203638332e31343938343235313936383439363636206d0a3535352e35393035353131383131303234353533203638332e31343938343235313936383439363636206c0a530a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203636362e313431393638353033393336393336392054640a28312e205b4d656e6f725d20436172e174756c6120b72041636c6172616369f36e3a205475726e6164612061207265736964656e6369612073696e206f62736572766163696f6e657320646520737570657276697369f36e2e2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28322e205b4d61796f725d20436172e174756c6120b72052656368617a6f3a2046616c74616e20736f706f7274657320646520432d30333b20726563617074757261722920546a0a542a202867656e657261646f7265732e2920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030303631332d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303031323537203030303030206e200a30303030303033303734203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303031333134203030303030206e200a30303030303031343339203030303030206e200a30303030303031353639203030303030206e200a30303030303031373032203030303030206e200a30303030303031383339203030303030206e200a30303030303031393632203030303030206e200a30303030303032303931203030303030206e200a30303030303032323233203030303030206e200a30303030303032333539203030303030206e200a30303030303032343837203030303030206e200a30303030303032363134203030303030206e200a30303030303032373433203030303030206e200a30303030303032383736203030303030206e200a30303030303032393738203030303030206e200a30303030303033333232203030303030206e200a30303030303033343038203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c31374637313839464334413238344333323938383930363637373246324445303e203c31374637313839464334413238344333323938383930363637373246324445303e205d0a3e3e0a7374617274787265660a333531320a2525454f46	2026-06-22 01:11:01.936809+00	contrato	\N
3	27	observaciones_EST-002_OBRA-2026-PRUEBA-FINAL_2026-06-18.pdf	application/pdf	4089	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313035330a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203738352e313937303836363134313733323538362054640a284f62736572766163696f6e6573206465206c612076657273696f6e2072656368617a6164612920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203736322e353139393231323539383432343736352054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203734352e353132303437323434303934343436382054640a28457374696d6163696f6e3a204553542d303032205c2876657273696f6e2072656368617a6164615c292920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203732382e353034313733323238333436343137312054640a2846656368612064652064657363617267613a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203639342e343838343235313936383530333537372054640a2823207c2053656363696f6e207c205469706f207c20536576657269646164207c204f62736572766163696f6e2920546a0a45540a302e373120470a33392e36383530333933373030373837343037203638332e31343938343235313936383439363636206d0a3535352e35393035353131383131303234353533203638332e31343938343235313936383439363636206c0a530a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203636362e313431393638353033393336393336392054640a28312e205b4d656e6f725d20436172e174756c6120b72041636c6172616369f36e3a205475726e6164612061207265736964656e6369612073696e206f62736572766163696f6e657320646520737570657276697369f36e2e2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28322e205b4d61796f725d20436172e174756c6120b72052656368617a6f3a2046616c74616e20736f706f7274657320646520432d30333b20726563617074757261722920546a0a542a202867656e657261646f7265732e2920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030303631332d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303031323537203030303030206e200a30303030303033303734203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303031333134203030303030206e200a30303030303031343339203030303030206e200a30303030303031353639203030303030206e200a30303030303031373032203030303030206e200a30303030303031383339203030303030206e200a30303030303031393632203030303030206e200a30303030303032303931203030303030206e200a30303030303032323233203030303030206e200a30303030303032333539203030303030206e200a30303030303032343837203030303030206e200a30303030303032363134203030303030206e200a30303030303032373433203030303030206e200a30303030303032383736203030303030206e200a30303030303032393738203030303030206e200a30303030303033333232203030303030206e200a30303030303033343038203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c31374637313839464334413238344333323938383930363637373246324445303e203c31374637313839464334413238344333323938383930363637373246324445303e205d0a3e3e0a7374617274787265660a333531320a2525454f46	2026-06-22 01:13:49.032115+00	oficio_convenio	3
4	53	observaciones_EST-002_OBRA-2026-PRUEBA-FINAL_2026-06-18.pdf	application/pdf	4089	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313035330a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203738352e313937303836363134313733323538362054640a284f62736572766163696f6e6573206465206c612076657273696f6e2072656368617a6164612920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203736322e353139393231323539383432343736352054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203734352e353132303437323434303934343436382054640a28457374696d6163696f6e3a204553542d303032205c2876657273696f6e2072656368617a6164615c292920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203732382e353034313733323238333436343137312054640a2846656368612064652064657363617267613a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203639342e343838343235313936383530333537372054640a2823207c2053656363696f6e207c205469706f207c20536576657269646164207c204f62736572766163696f6e2920546a0a45540a302e373120470a33392e36383530333933373030373837343037203638332e31343938343235313936383439363636206d0a3535352e35393035353131383131303234353533203638332e31343938343235313936383439363636206c0a530a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203636362e313431393638353033393336393336392054640a28312e205b4d656e6f725d20436172e174756c6120b72041636c6172616369f36e3a205475726e6164612061207265736964656e6369612073696e206f62736572766163696f6e657320646520737570657276697369f36e2e2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28322e205b4d61796f725d20436172e174756c6120b72052656368617a6f3a2046616c74616e20736f706f7274657320646520432d30333b20726563617074757261722920546a0a542a202867656e657261646f7265732e2920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030303631332d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303031323537203030303030206e200a30303030303033303734203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303031333134203030303030206e200a30303030303031343339203030303030206e200a30303030303031353639203030303030206e200a30303030303031373032203030303030206e200a30303030303031383339203030303030206e200a30303030303031393632203030303030206e200a30303030303032303931203030303030206e200a30303030303032323233203030303030206e200a30303030303032333539203030303030206e200a30303030303032343837203030303030206e200a30303030303032363134203030303030206e200a30303030303032373433203030303030206e200a30303030303032383736203030303030206e200a30303030303032393738203030303030206e200a30303030303033333232203030303030206e200a30303030303033343038203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c31374637313839464334413238344333323938383930363637373246324445303e203c31374637313839464334413238344333323938383930363637373246324445303e205d0a3e3e0a7374617274787265660a333531320a2525454f46	2026-06-22 17:05:54.034173+00	contrato	\N
\.


--
-- Data for Name: contrato_garantias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_garantias (id, contrato_id, tipo, afianzadora, poliza, monto, vigencia, created_at, pdf_nombre, pdf_mime, pdf_tamano, pdf_contenido, registrado_por) FROM stdin;
150	53	Anticipo	das	sadsa	8265.60	2026-06-22	2026-06-22 17:05:53.683791+00	\N	\N	\N	\N	\N
151	53	Cumplimiento	sadadsdsa	dsa	215.00	2026-06-22	2026-06-22 17:05:53.683791+00	\N	\N	\N	\N	\N
73	26	Cumplimiento	Fianzas del Pacífico S.A.	FC-2026-001	100000.00	2027-06-01	2026-06-21 21:53:40.071664+00	\N	\N	\N	\N	\N
74	26	Anticipo	Fianzas del Pacífico S.A.	FC-2026-001	300000.00	2027-06-01	2026-06-21 21:53:40.071664+00	\N	\N	\N	\N	\N
75	26	cumplimiento	Fianzas del Pacífico S.A.	FC-2026-001	100000.00	2027-06-01	2026-06-21 22:06:33.91003+00	reporte_1_avance-fisico_mensual_2026-06-18.pdf	application/pdf	4883	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313834370a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203739302e383636333737393532373535383937322054640a285265706f72746520312097204176616e63652066ed7369636f2076732070726f6772616d61646f2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203737312e303233383538323637373136343931342054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c20b7204172712e204361726c6f7320436f6e74726174697374612044656d6f2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203735342e303135393834323531393638343631362054640a28506572696f646f3a204d656e7375616c20b72047656e657261646f3a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203732322e383334383831383839373633373738342054640a2843757276612053205c2825206163756d756c61646f5c292920546a0a45540a42540a2f463120392054660a31302e3334393939393939393939393939393620544c0a3020670a33392e36383530333933373030373837343037203730302e31353737313635333534333331312054640a284d6573207c2050726f6772616d61646f207c20456a6563757461646f207c2046696e616e636965726f2920546a0a45540a302e373820470a33392e36383530333933373030373837343037203638382e383139313333383538323637373139206d0a3535352e35393035353131383131303234353533203638382e383139313333383538323637373139206c0a530a42540a2f463120392054660a31302e3334393939393939393939393939393620544c0a3020670a33392e36383530333933373030373837343037203637372e3438303535313138313130323332382054640a284d617220207c20203130302520207c202033322e38392520207c202030252920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28436f6e636570746f20d720706572696f646f205c2863616e746964616420706c616e656164615c292920546a0a45540a42540a2f463120382054660a392e3139393939393939393939393939393320544c0a3020670a33392e36383530333933373030373837343037203632392e3239313537343830333134393631352054640a28436c617665207c20436f6e636570746f207c20556e69646164207c202333204d6172207c20436f6e7472617461646f207c20456a6563757461646f207c2025204176616e63652920546a0a45540a33392e36383530333933373030373837343037203631372e393532393932313235393834323234206d0a3535352e35393035353131383131303234353533203631372e393532393932313235393834323234206c0a530a42540a2f463120382054660a392e3139393939393939393939393939393320544c0a3020670a33392e36383530333933373030373837343037203630362e3631343430393434383831383833332054640a28432d3031207c204c696d7069657a612079207472617a6f2064656c2074657272656e6f207c206db2207c20207c2031303030207c2031303030207c203130302920546a0a45540a42540a2f463120382054660a392e3139393939393939393939393939393320544c0a3020670a33392e36383530333933373030373837343037203539322e343431313831313032333632313739342054640a28432d3032207c204578636176616369f36e2061206de17175696e61207c206db3207c20207c20353030207c20323530207c2035302920546a0a45540a42540a2f463120382054660a392e3139393939393939393939393939393320544c0a3020670a33392e36383530333933373030373837343037203537382e323637393532373535393035353235392054640a28432d3033207c20436f6e637265746f206692633d323030206b672f636db2207c206db3207c20313530207c20333030207c2030207c20302920546a0a45540a42540a2f463120382054660a392e3139393939393939393939393939393320544c0a3020670a33392e36383530333933373030373837343037203536342e303934373234343039343438373538372054640a28432d3034207c20416365726f206465207265667565727a6f2066793d34323030207c206b67207c2031303030207c2032303030207c2030207c20302920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030333331312d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303032303531203030303030206e200a30303030303033383638203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303032313038203030303030206e200a30303030303032323333203030303030206e200a30303030303032333633203030303030206e200a30303030303032343936203030303030206e200a30303030303032363333203030303030206e200a30303030303032373536203030303030206e200a30303030303032383835203030303030206e200a30303030303033303137203030303030206e200a30303030303033313533203030303030206e200a30303030303033323831203030303030206e200a30303030303033343038203030303030206e200a30303030303033353337203030303030206e200a30303030303033363730203030303030206e200a30303030303033373732203030303030206e200a30303030303034313136203030303030206e200a30303030303034323032203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c37453730393345374243303639313331334338394644414437383545383139343e203c37453730393345374243303639313331334338394644414437383545383139343e205d0a3e3e0a7374617274787265660a343330360a2525454f46	4
76	27	Cumplimiento	sda	sad	5445.00	2026-06-21	2026-06-22 01:11:01.623717+00	\N	\N	\N	\N	\N
77	27	Anticipo	sad	ads	4726.80	2026-06-21	2026-06-22 01:11:01.623717+00	\N	\N	\N	\N	\N
78	28	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0001	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
79	28	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0001	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
80	28	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0001	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
82	29	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0002	300000.00	2026-06-25	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
81	29	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0002	100000.00	2026-07-04	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
83	29	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0002	100000.00	2026-07-17	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
84	30	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0003	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
85	30	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0003	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
86	30	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0003	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
87	31	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0004	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
88	31	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0004	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
89	31	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0004	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
90	32	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0005	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
91	32	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0005	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
92	32	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0005	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
93	33	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0006	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
94	33	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0006	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
95	33	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0006	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
96	34	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0007	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
97	34	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0007	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
98	34	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0007	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
99	35	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0008	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
100	35	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0008	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
101	35	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0008	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
102	36	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0009	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
103	36	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0009	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
104	36	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0009	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
105	37	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0010	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
106	37	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0010	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
107	37	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0010	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
108	38	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0011	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
109	38	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0011	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
110	38	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0011	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
111	39	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0012	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
112	39	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0012	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
113	39	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0012	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
114	40	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0013	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
115	40	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0013	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
116	40	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0013	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
117	41	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0014	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
118	41	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0014	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
119	41	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0014	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
120	42	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0015	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
121	42	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0015	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
122	42	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0015	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
123	43	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0016	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
124	43	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0016	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
125	43	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0016	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
126	44	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0017	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
127	44	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0017	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
128	44	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0017	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
129	45	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0018	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
130	45	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0018	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
131	45	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0018	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
132	46	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0019	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
133	46	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0019	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
134	46	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0019	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
135	47	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0020	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
136	47	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0020	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
137	47	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0020	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
138	48	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0021	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
139	48	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0021	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
140	48	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0021	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
141	49	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0022	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
142	49	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0022	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
143	49	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0022	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
144	50	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0023	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
145	50	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0023	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
146	50	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0023	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
147	51	cumplimiento	Afianzadora Aserta, S.A.	FZA-CUMP-OP-2026-0024	100000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
148	51	anticipo	Afianzadora Aserta, S.A.	FZA-ANT-OP-2026-0024	300000.00	2027-06-22	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
149	51	vicios_ocultos	Afianzadora Aserta, S.A.	FZA-VIC-OP-2026-0024	100000.00	2028-06-21	2026-06-22 16:50:13.015179+00	\N	\N	\N	\N	\N
152	27	cumplimiento	saddsa	\N	5000.00	2026-06-26	2026-06-23 00:33:57.85856+00	observaciones_EST-002_OBRA-2026-PRUEBA-FINAL_2026-06-18.pdf	application/pdf	4089	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313035330a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203738352e313937303836363134313733323538362054640a284f62736572766163696f6e6573206465206c612076657273696f6e2072656368617a6164612920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203736322e353139393231323539383432343736352054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203734352e353132303437323434303934343436382054640a28457374696d6163696f6e3a204553542d303032205c2876657273696f6e2072656368617a6164615c292920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203732382e353034313733323238333436343137312054640a2846656368612064652064657363617267613a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203639342e343838343235313936383530333537372054640a2823207c2053656363696f6e207c205469706f207c20536576657269646164207c204f62736572766163696f6e2920546a0a45540a302e373120470a33392e36383530333933373030373837343037203638332e31343938343235313936383439363636206d0a3535352e35393035353131383131303234353533203638332e31343938343235313936383439363636206c0a530a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203636362e313431393638353033393336393336392054640a28312e205b4d656e6f725d20436172e174756c6120b72041636c6172616369f36e3a205475726e6164612061207265736964656e6369612073696e206f62736572766163696f6e657320646520737570657276697369f36e2e2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28322e205b4d61796f725d20436172e174756c6120b72052656368617a6f3a2046616c74616e20736f706f7274657320646520432d30333b20726563617074757261722920546a0a542a202867656e657261646f7265732e2920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030303631332d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303031323537203030303030206e200a30303030303033303734203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303031333134203030303030206e200a30303030303031343339203030303030206e200a30303030303031353639203030303030206e200a30303030303031373032203030303030206e200a30303030303031383339203030303030206e200a30303030303031393632203030303030206e200a30303030303032303931203030303030206e200a30303030303032323233203030303030206e200a30303030303032333539203030303030206e200a30303030303032343837203030303030206e200a30303030303032363134203030303030206e200a30303030303032373433203030303030206e200a30303030303032383736203030303030206e200a30303030303032393738203030303030206e200a30303030303033333232203030303030206e200a30303030303033343038203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c31374637313839464334413238344333323938383930363637373246324445303e203c31374637313839464334413238344333323938383930363637373246324445303e205d0a3e3e0a7374617274787265660a333531320a2525454f46	4
\.


--
-- Data for Name: contrato_periodos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_periodos (id, contrato_id, numero, inicio, fin, created_at) FROM stdin;
151	53	1	2026-06-22	2026-07-01	2026-06-22 17:05:53.683791+00
73	26	1	2026-01-01	2026-01-31	2026-06-21 21:53:40.071664+00
74	26	2	2026-02-01	2026-02-28	2026-06-21 21:53:40.071664+00
75	26	3	2026-03-01	2026-03-31	2026-06-21 21:53:40.071664+00
76	27	1	2026-06-15	2026-07-14	2026-06-22 01:11:01.623717+00
77	27	2	2026-07-15	2026-08-14	2026-06-22 01:11:01.623717+00
78	27	3	2026-08-15	2026-09-12	2026-06-22 01:11:01.623717+00
79	28	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
80	28	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
81	28	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
82	29	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
83	29	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
84	29	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
85	30	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
86	30	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
87	30	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
88	31	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
89	31	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
90	31	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
91	32	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
92	32	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
93	32	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
94	33	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
95	33	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
96	33	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
97	34	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
98	34	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
99	34	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
100	35	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
101	35	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
102	35	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
103	36	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
104	36	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
105	36	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
106	37	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
107	37	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
108	37	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
109	38	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
110	38	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
111	38	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
112	39	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
113	39	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
114	39	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
115	40	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
116	40	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
117	40	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
118	41	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
119	41	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
120	41	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
121	42	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
122	42	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
123	42	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
124	43	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
125	43	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
126	43	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
127	44	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
128	44	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
129	44	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
130	45	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
131	45	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
132	45	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
133	46	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
134	46	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
135	46	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
136	47	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
137	47	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
138	47	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
139	48	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
140	48	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
141	48	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
142	49	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
143	49	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
144	49	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
145	50	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
146	50	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
147	50	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
148	51	1	2026-04-23	2026-05-22	2026-06-22 16:50:13.015179+00
149	51	2	2026-05-23	2026-06-21	2026-06-22 16:50:13.015179+00
150	51	3	2026-06-22	2026-07-21	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: contrato_roster; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contrato_roster (id, contrato_id, rol, usuario_id, vigencia_desde, vigencia_hasta, motivo, sustituye_a, nota_id, registrado_por, created_at) FROM stdin;
152	53	residente	35	2026-06-22	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-22 17:05:53.683791+00
153	53	superintendente	2	2026-06-22	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-22 17:05:53.683791+00
154	53	supervision	3	2026-06-22	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-22 17:05:53.683791+00
73	26	residente	35	2026-01-01	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-21 21:53:40.071664+00
75	26	supervision	3	2026-01-01	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-21 21:53:40.071664+00
74	26	superintendente	2	2026-01-01	2026-06-21	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-21 21:53:40.071664+00
76	26	superintendente	7	2026-06-21	\N	Cambio de superintendente (art. 125 fr. I g RLOPSRM).	74	29	4	2026-06-21 23:26:29.658448+00
77	27	residente	35	2026-06-15	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-22 01:11:01.623717+00
78	27	superintendente	2	2026-06-15	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-22 01:11:01.623717+00
79	27	supervision	22	2026-06-15	\N	Asignación inicial (alta del contrato)	\N	\N	35	2026-06-22 01:11:01.623717+00
80	28	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
81	28	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
82	28	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
83	29	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
84	29	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
85	29	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
86	30	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
87	30	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
88	30	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
89	31	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
90	31	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
91	31	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
92	32	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
93	32	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
94	32	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
95	33	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
96	33	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
97	33	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
98	34	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
99	34	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
100	34	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
101	35	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
102	35	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
103	35	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
104	36	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
105	36	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
106	36	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
107	37	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
108	37	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
109	37	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
110	38	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
111	38	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
112	38	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
113	39	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
114	39	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
115	39	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
116	40	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
117	40	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
118	40	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
119	41	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
120	41	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
121	41	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
122	42	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
123	42	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
124	42	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
125	43	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
126	43	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
127	43	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
128	44	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
129	44	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
130	44	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
131	45	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
132	45	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
133	45	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
134	46	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
135	46	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
136	46	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
137	47	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
138	47	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
139	47	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
140	48	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
141	48	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
142	48	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
143	49	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
144	49	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
145	49	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
146	50	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
147	50	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
148	50	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
149	51	residente	1	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
150	51	superintendente	2	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
151	51	supervision	3	2026-04-23	\N	Asignación inicial (alta del contrato)	\N	\N	1	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: contratos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contratos (id, folio, tipo, objeto, contratista, dependencia, monto, plazo_dias, fecha_inicio, fecha_termino, pdf_path, created_by, created_at, datos_juridicos, anticipo_pct, penalizacion, amortizacion, ubicacion, residente_id, superintendente_id, supervision_id, dependencia_id, ciclo_estimacion, pena_convencional_pct, estado, cerrado_en) FROM stdin;
30	OP-2026-0003	Obra pública sobre la base de precios unitarios	Ampliación del laboratorio de cómputo y cableado estructurado	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1060000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
26	OBRA-2026-PRUEBA-FINAL	Obra pública sobre la base de precios unitarios	onstrucción de aula didáctica — campus UAGRO (prueba E2E final)	Arq. Carlos Contratista Demo	Lic. Diana Dependencia Demo	1000000.00	100	2026-01-01	2026-04-10	\N	35	2026-06-21 21:53:40.071664+00	{"notaria": "", "cargoFirmante": "Directora de Obras Públicas", "poderNotarial": "", "cedulaProfesional": "12345678", "representanteLegal": "Arq. Carlos Contratista Demo", "firmanteDependencia": "Lic. Diana Dependencia Demo"}	30.00	\N	\N	Av. Juárez s/n, Chilpancingo, Gro	35	7	3	4	mensual	\N	cerrado	2026-06-21 23:35:00.643118+00
31	OP-2026-0004	Obra pública sobre la base de precios unitarios	Construcción de la barda perimetral y caseta de control de acceso	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
27	saddsa	Obra pública sobre la base de precios unitarios	fsaadfs	Arq. Carlos Contratista Demo	Lic. Diana Dependencia Demo	158772.00	1000	2026-06-15	2029-03-10	\N	35	2026-06-22 01:11:01.623717+00	{"notaria": "ads", "cargoFirmante": "sad", "poderNotarial": "asd", "cedulaProfesional": "asd", "representanteLegal": "Arq. Carlos Contratista Demo", "firmanteDependencia": "Lic. Diana Dependencia Demo"}	30.00	\N	\N	dfsadfas	35	2	22	4	mensual	\N	vigente	\N
28	OP-2026-0001	Obra pública sobre la base de precios unitarios	Construcción de aulas didácticas en la Facultad de Ingeniería, UAGRO	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
29	OP-2026-0002	Obra pública sobre la base de precios unitarios	Rehabilitación de la red hidrosanitaria del edificio administrativo	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
32	OP-2026-0005	Obra pública sobre la base de precios unitarios	Pavimentación con concreto hidráulico de andadores del campus	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
33	OP-2026-0006	Obra pública sobre la base de precios unitarios	Suministro y colocación de impermeabilizante en azoteas	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
34	OP-2026-0007	Obra pública sobre la base de precios unitarios	Construcción de la subestación eléctrica y acometida	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
35	OP-2026-0008	Obra pública sobre la base de precios unitarios	Habilitación de aula magna y sistema audiovisual	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
36	OP-2026-0009	Obra pública sobre la base de precios unitarios	Construcción de sanitarios y módulo de regaderas	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
37	OP-2026-0010	Obra pública sobre la base de precios unitarios	Rehabilitación de fachada e impermeabilización del edificio central	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
38	OP-2026-0011	Obra pública sobre la base de precios unitarios	Construcción de estacionamiento y obra exterior	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
39	OP-2026-0012	Obra pública sobre la base de precios unitarios	Construcción de cisterna y sistema de bombeo	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
40	OP-2026-0013	Obra pública sobre la base de precios unitarios	Construcción de comedor universitario y cocina	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
41	OP-2026-0014	Obra pública sobre la base de precios unitarios	Construcción de biblioteca y sala de lectura	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
42	OP-2026-0015	Obra pública sobre la base de precios unitarios	Construcción de gimnasio techado y vestidores	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
43	OP-2026-0016	Obra pública sobre la base de precios unitarios	Construcción de auditorio al aire libre y foro	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
44	OP-2026-0017	Obra pública sobre la base de precios unitarios	Construcción de centro de cómputo y servidores	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
45	OP-2026-0018	Obra pública sobre la base de precios unitarios	Construcción de enfermería y servicio médico universitario	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
46	OP-2026-0019	Obra pública sobre la base de precios unitarios	Construcción de talleres de mantenimiento y almacén	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
47	OP-2026-0020	Obra pública sobre la base de precios unitarios	Construcción de andén de carga y patio de maniobras	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
48	OP-2026-0021	Obra pública sobre la base de precios unitarios	Construcción de cafetería y áreas de convivencia	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
49	OP-2026-0022	Obra pública sobre la base de precios unitarios	Construcción de caseta de vigilancia y control vehicular	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
50	OP-2026-0023	Obra pública sobre la base de precios unitarios	Rehabilitación de la planta de tratamiento de agua	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	vigente	\N
51	OP-2026-0024	Obra pública sobre la base de precios unitarios	Construcción del edificio de posgrado e investigación	Ing. Carlos Méndez Rivera	Lic. Diana Herrera Salgado	1000000.00	90	2026-04-23	2026-07-21	\N	1	2026-06-22 16:50:13.015179+00	{"ramo": "Obra pública educativa", "licitacion": "LO-911037999-E12-2026", "fecha_fallo": "2026-01-30"}	30.00	\N	\N	Ciudad Universitaria, Chilpancingo de los Bravo, Guerrero	1	2	3	4	mensual	0.0010	cerrado	2026-06-22 16:50:13.015179+00
52	OP-2026-DEMO-001	Obra pública (precios unitarios)	Rehabilitación de pavimento - tramo demo Sprint 0	Contratista Demo S.A.	Secretaría de Obras Públicas (demo)	1500000.00	120	2026-06-22	2026-10-20	\N	1	2026-06-22 16:50:27.803779+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	vigente	\N
53	kjahbdskdsa	Obra pública sobre la base de precios unitarios	alsdkjlasd	Ing. Carlos Méndez Rivera	Lic. Diana Dependencia Sur	27552.00	10	2026-06-22	2026-07-01	\N	35	2026-06-22 17:05:53.683791+00	{"notaria": "asdds", "cargoFirmante": "sfa", "poderNotarial": "adssd", "cedulaProfesional": "dsadsa", "representanteLegal": "Ing. Carlos Méndez Rivera", "firmanteDependencia": "Lic. Diana Dependencia Sur"}	30.00	\N	\N	lkjadslsa	35	2	3	12	mensual	\N	vigente	\N
\.


--
-- Data for Name: convenios_modificatorios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.convenios_modificatorios (id, contrato_id, numero, folio, tipo, fundamento, motivo, fecha, monto_anterior, monto_nuevo, plazo_anterior_dias, plazo_nuevo_dias, delta_monto_pct, delta_plazo_pct, requiere_revision_sfp, requiere_ajuste_costos, autorizado_por, created_at, nota_id, estado, autorizado_en) FROM stdin;
2	26	1	CM-001	plazo	art59	Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM)	2026-06-21	1000000.00	1000000.00	90	100	0.00	11.11	f	f	4	2026-06-21 23:15:24.033655+00	28	autorizado	2026-06-21 23:17:46.121183+00
3	27	1	CM-001	mixto	art59	sfddsf	2026-06-22	15756.00	158772.00	90	1000	907.69	1011.11	t	t	4	2026-06-22 01:13:14.898427+00	35	autorizado	2026-06-22 01:13:56.997827+00
4	30	1	CM-001	monto	art59	Incremento de volumen de terracerías por condiciones del terreno.	2026-06-17	1000000.00	1060000.00	\N	\N	6.00	\N	f	f	4	2026-06-22 16:50:13.015179+00	39	autorizado	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empresas (id, nombre, creado_en, tipo, estado) FROM stdin;
1	Secretaría de Obras Públicas del Estado de Guerrero	2026-06-21 19:31:37.258863+00	dependencia	validada
4	H. Ayuntamiento de Chilpancingo de los Bravo	2026-06-21 19:32:37.795676+00	dependencia	validada
7	Universidad Autónoma de Guerrero	2026-06-21 19:32:38.935864+00	dependencia	validada
2	Constructora del Bajío, S.A. de C.V.	2026-06-21 19:31:37.258863+00	contratista	validada
5	Edificaciones del Norte, S.A. de C.V.	2026-06-21 19:32:37.795676+00	contratista	validada
8	Grupo Constructor Pacífico, S.A. de C.V.	2026-06-21 19:32:38.935864+00	contratista	validada
3	Supervisión Técnica Integral, S.C.	2026-06-21 19:31:37.258863+00	supervision	validada
6	Consultoría y Supervisión de Obra, S.C.	2026-06-21 19:32:37.795676+00	supervision	validada
9	Ingeniería y Control de Calidad del Sur, S.C.	2026-06-21 19:32:38.935864+00	supervision	validada
11	Constructora Demo	2026-06-21 20:30:25.690605+00	contratista	validada
10	Dependencia Demo	2026-06-21 20:30:25.690605+00	dependencia	validada
12	Supervisión Externa Demo	2026-06-21 20:30:25.690605+00	supervision	validada
13	gucci	2026-06-22 16:09:38.981344+00	contratista	validada
14	gucciii	2026-06-22 16:18:55.182572+00	contratista	por_validar
15	Constructora del Bajio SA de CV	2026-06-22 16:50:13.015179+00	contratista	por_validar
16	Edificadora Acapulco, S.A. de C.V.	2026-06-22 16:50:13.015179+00	contratista	por_validar
\.


--
-- Data for Name: estimacion_fotos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estimacion_fotos (id, estimacion_id, nombre, descripcion, created_at, mime, tamano, contenido, subido_por) FROM stdin;
\.


--
-- Data for Name: estimacion_generadores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estimacion_generadores (id, estimacion_id, contrato_concepto_id, cantidad_periodo, cantidad_anterior_acum, pu_snapshot) FROM stdin;
16	16	73	100.0000	0.0000	50.0000
17	16	74	250.0000	0.0000	200.0000
18	17	73	1000.0000	0.0000	50.0000
19	17	74	250.0000	0.0000	200.0000
20	18	88	1000.0000	0.0000	300.0000
21	19	91	1000.0000	0.0000	300.0000
22	20	115	1000.0000	0.0000	300.0000
23	21	118	1000.0000	0.0000	300.0000
24	22	119	200.0000	0.0000	1500.0000
25	23	120	1.0000	0.0000	400000.0000
26	24	121	1000.0000	0.0000	300.0000
27	25	124	1000.0000	0.0000	300.0000
28	26	127	1000.0000	0.0000	300.0000
29	27	128	200.0000	0.0000	1500.0000
30	28	133	1000.0000	0.0000	300.0000
31	29	136	1000.0000	0.0000	300.0000
32	30	139	1000.0000	0.0000	300.0000
33	31	148	1000.0000	0.0000	300.0000
34	32	149	200.0000	0.0000	1500.0000
35	33	150	1.0000	0.0000	400000.0000
36	34	151	1312.0000	0.0000	21.0000
37	35	77	524.0000	0.0000	45.0000
\.


--
-- Data for Name: estimacion_notas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estimacion_notas (estimacion_id, nota_id) FROM stdin;
16	25
17	26
17	27
35	67
35	68
\.


--
-- Data for Name: estimacion_observaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estimacion_observaciones (id, estimacion_id, seccion, tipo, severidad, descripcion, estado, turnado_a, autor_id, created_at, solventada_en) FROM stdin;
6	16	generadores	rechazo	mayor	esta mal lo acumulado	abierta	residencia	3	2026-06-21 22:53:18.111122+00	\N
7	16	caratula	rechazo	mayor	mal los conceptos	abierta	contratista	35	2026-06-21 22:54:05.281159+00	\N
8	17	caratula	aclaracion	menor	Turnada a residencia sin observaciones de supervisión.	abierta	residencia	3	2026-06-21 22:59:01.958005+00	\N
9	22	caratula	aclaracion	menor	Revisada por supervisión y autorizada por la residencia.	solventada	residencia	3	2026-06-22 16:50:13.015179+00	\N
10	25	generadores	rechazo	mayor	Los números generadores no coinciden con lo ejecutado; se devuelve para corrección.	abierta	contratista	1	2026-06-22 16:50:13.015179+00	\N
11	27	caratula	aclaracion	menor	Revisada por supervisión y autorizada por la residencia.	solventada	residencia	3	2026-06-22 16:50:13.015179+00	\N
12	29	caratula	aclaracion	menor	Revisada por supervisión y autorizada por la residencia.	solventada	residencia	3	2026-06-22 16:50:13.015179+00	\N
13	30	caratula	aclaracion	menor	Revisada por supervisión y autorizada por la residencia.	solventada	residencia	3	2026-06-22 16:50:13.015179+00	\N
14	35	caratula	aclaracion	menor	Turnada a residencia sin observaciones de supervisión.	abierta	residencia	22	2026-06-22 22:31:17.014127+00	\N
\.


--
-- Data for Name: estimacion_soportes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estimacion_soportes (id, estimacion_id, nombre, descripcion, created_at) FROM stdin;
1	17	Factura	F-2026-001	2026-06-21 23:03:49.686847+00
2	17	CFDI	A1B2C3D4-1111-2222-3333-444455556666	2026-06-21 23:03:52.128981+00
3	35	Factura	78558685	2026-06-23 00:27:26.155796+00
4	35	CFDI	85868686	2026-06-23 00:27:27.8738+00
\.


--
-- Data for Name: estimaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estimaciones (id, contrato_id, numero, periodo_inicio, periodo_fin, estado, anticipo_pct_snapshot, subtotal, amortizacion, retencion, deductivas, neto, integrada_por, integrada_en, enviada_en, enviada_por, reemplaza_a, retencion_atraso, avance_fisico_pct, avance_financiero_pct) FROM stdin;
16	26	1	2026-01-01	2026-01-31	rechazada	30.00	55000.00	16500.00	275.00	0.00	38225.00	2	2026-06-21 22:49:54.852848+00	2026-06-21 22:52:15.047458+00	2	\N	0.00	5.5000	0.0000
17	26	2	2026-01-01	2026-01-31	pagada	30.00	100000.00	30000.00	500.00	0.00	69500.00	2	2026-06-21 22:58:17.21768+00	2026-06-21 22:58:30.548596+00	2	\N	0.00	10.0000	0.0000
18	31	1	2026-04-23	2026-05-22	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
19	32	1	2026-04-23	2026-05-22	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
20	40	1	2026-04-23	2026-05-22	integrada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	\N	\N	\N	0.00	\N	\N
21	41	1	2026-04-23	2026-05-22	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
22	41	2	2026-05-23	2026-06-21	autorizada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
23	41	3	2026-06-22	2026-07-21	enviada	30.00	400000.00	120000.00	2000.00	0.00	278000.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
24	42	1	2026-04-23	2026-05-22	enviada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
25	43	1	2026-04-23	2026-05-22	rechazada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
26	44	1	2026-04-23	2026-05-22	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
27	44	2	2026-05-23	2026-06-21	autorizada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
28	46	1	2026-04-23	2026-05-22	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
29	47	1	2026-04-23	2026-05-22	autorizada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
30	48	1	2026-04-23	2026-05-22	autorizada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
31	51	1	2026-04-23	2026-05-22	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
32	51	2	2026-05-23	2026-06-21	pagada	30.00	300000.00	90000.00	1500.00	0.00	208500.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
33	51	3	2026-06-22	2026-07-21	pagada	30.00	400000.00	120000.00	2000.00	0.00	278000.00	2	2026-06-16 00:00:00+00	2026-06-19 00:00:00+00	2	\N	0.00	\N	\N
34	53	1	2026-06-22	2026-07-01	enviada	30.00	27552.00	8265.60	137.76	0.00	19148.64	2	2026-06-22 17:09:26.609831+00	2026-06-22 17:10:41.687194+00	2	\N	0.00	100.0000	0.0000
35	27	1	2026-06-15	2026-07-14	pagada	30.00	23580.00	7074.00	117.90	0.00	16388.10	2	2026-06-22 22:05:44.229841+00	2026-06-22 22:12:30.168387+00	2	\N	0.00	14.8515	0.0000
\.


--
-- Data for Name: finiquitos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finiquitos (id, contrato_id, importe_neto_aprobado, total_pagado, anticipo_no_amortizado, ajustes_finales, saldo, a_favor_de, importe_real_ejecutado, observaciones, nota_id, elaborado_por, created_at) FROM stdin;
1	26	69500.00	69500.00	270000.00	0.00	-270000.00	dependencia	100000.00		30	4	2026-06-21 23:35:00.643118+00
2	51	695000.00	695000.00	0.00	0.00	0.00	ninguno	1000000.00	Finiquito elaborado en la demo (todas las estimaciones pagadas).	63	1	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: garantia_endosos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.garantia_endosos (id, garantia_id, convenio_id, motivo, nuevo_monto, nueva_vigencia, observaciones, registrado_por, created_at) FROM stdin;
2	75	\N	prorroga_vigencia	120000.00	2028-06-01	Endoso por prórroga de vigencia (art. 91 RLOPSRM).	4	2026-06-21 22:08:29.000797+00
3	81	\N	prorroga_vigencia	\N	2027-07-27	Prórroga de la fianza de cumplimiento (art. 91 RLOPSRM).	1	2026-06-22 16:50:13.015179+00
4	76	\N	prorroga_vigencia	\N	2026-06-25	saddas	4	2026-06-23 00:31:29.653459+00
\.


--
-- Data for Name: instruccion_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.instruccion_pago (id, estimacion_id, presupuesto_anual_id, monto, factura_cfdi, soportes_ok, estado, fecha_instruccion, instruida_por, notificado_finanzas_en, created_at) FROM stdin;
1	17	1	69500.00	A1B2C3D4-1111-2222-3333-444455556666	t	emitida	2026-06-21	18	2026-06-21 23:04:08.504038+00	2026-06-21 23:04:08.504038+00
2	35	1	16388.10	85868686	t	emitida	2026-06-23	6	2026-06-23 00:36:07.461207+00	2026-06-23 00:36:07.461207+00
\.


--
-- Data for Name: minutas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.minutas (id, contrato_id, titulo, fecha, lugar, acuerdos, nota_id, pdf_nombre, pdf_mime, pdf_tamano, pdf_contenido, registrada_por, created_at, participantes) FROM stdin;
2	26	Arq. Carlos Contratista Demo (Contratista), Ing. Sofía Supervisión Demo (Supervisión), Residente de obra	2026-01-15	Sala de juntas — Residencia de obra, campus UAGRO	Iniciar trazo y limpieza; entrega de programa firmado; próxima reunión en P2.	\N	observaciones_EST-002_OBRA-2026-PRUEBA-FINAL_2026-06-18.pdf	application/pdf	4089	\\x255044462d312e330a25badface00a332030206f626a0a3c3c2f54797065202f506167650a2f506172656e742031203020520a2f5265736f75726365732032203020520a2f4d65646961426f78205b302030203539352e32373939393939393939393939373237203834312e383839393939393939393939393836345d0a2f436f6e74656e74732034203020520a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f4c656e67746820313035330a3e3e0a73747265616d0a302e3536373030303030303030303030303120770a3020470a42540a2f46312031342054660a31362e3039393939393939393939393939373920544c0a3020670a33392e36383530333933373030373837343037203738352e313937303836363134313733323538362054640a284f62736572766163696f6e6573206465206c612076657273696f6e2072656368617a6164612920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203736322e353139393231323539383432343736352054640a28436f6e747261746f3a204f4252412d323032362d5052554542412d46494e414c2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203734352e353132303437323434303934343436382054640a28457374696d6163696f6e3a204553542d303032205c2876657273696f6e2072656368617a6164615c292920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203732382e353034313733323238333436343137312054640a2846656368612064652064657363617267613a2031382f362f323032362920546a0a45540a42540a2f46312031312054660a31322e3634393939393939393939393939383620544c0a3020670a33392e36383530333933373030373837343037203639342e343838343235313936383530333537372054640a2823207c2053656363696f6e207c205469706f207c20536576657269646164207c204f62736572766163696f6e2920546a0a45540a302e373120470a33392e36383530333933373030373837343037203638332e31343938343235313936383439363636206d0a3535352e35393035353131383131303234353533203638332e31343938343235313936383439363636206c0a530a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203636362e313431393638353033393336393336392054640a28312e205b4d656e6f725d20436172e174756c6120b72041636c6172616369f36e3a205475726e6164612061207265736964656e6369612073696e206f62736572766163696f6e657320646520737570657276697369f36e2e2920546a0a45540a42540a2f46312031302054660a31312e3520544c0a3020670a33392e36383530333933373030373837343037203634362e323939343438383138383937363434372054640a28322e205b4d61796f725d20436172e174756c6120b72052656368617a6f3a2046616c74616e20736f706f7274657320646520432d30333b20726563617074757261722920546a0a542a202867656e657261646f7265732e2920546a0a45540a656e6473747265616d0a656e646f626a0a312030206f626a0a3c3c2f54797065202f50616765730a2f4b696473205b3320302052205d0a2f436f756e7420310a3e3e0a656e646f626a0a352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963610a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f48656c7665746963612d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a392030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965720a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31302030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31312030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d4f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31322030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f436f75726965722d426f6c644f626c697175650a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31332030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d526f6d616e0a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31342030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c640a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31352030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d4974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31362030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f54696d65732d426f6c644974616c69630a2f53756274797065202f54797065310a2f456e636f64696e67202f57696e416e7369456e636f64696e670a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31372030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f5a61706644696e67626174730a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a31382030206f626a0a3c3c0a2f54797065202f466f6e740a2f42617365466f6e74202f53796d626f6c0a2f53756274797065202f54797065310a2f4669727374436861722033320a2f4c61737443686172203235350a3e3e0a656e646f626a0a322030206f626a0a3c3c0a2f50726f63536574205b2f504446202f54657874202f496d61676542202f496d61676543202f496d616765495d0a2f466f6e74203c3c0a2f46312035203020520a2f46322036203020520a2f46332037203020520a2f46342038203020520a2f46352039203020520a2f4636203130203020520a2f4637203131203020520a2f4638203132203020520a2f4639203133203020520a2f463130203134203020520a2f463131203135203020520a2f463132203136203020520a2f463133203137203020520a2f463134203138203020520a3e3e0a2f584f626a656374203c3c0a3e3e0a3e3e0a656e646f626a0a31392030206f626a0a3c3c0a2f50726f647563657220286a7350444620342e322e31290a2f4372656174696f6e446174652028443a32303236303631383030303631332d303627303027290a3e3e0a656e646f626a0a32302030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031203020520a2f4f70656e416374696f6e205b3320302052202f46697448206e756c6c5d0a2f506167654c61796f7574202f4f6e65436f6c756d6e0a3e3e0a656e646f626a0a787265660a302032310a303030303030303030302036353533352066200a30303030303031323537203030303030206e200a30303030303033303734203030303030206e200a30303030303030303135203030303030206e200a30303030303030313532203030303030206e200a30303030303031333134203030303030206e200a30303030303031343339203030303030206e200a30303030303031353639203030303030206e200a30303030303031373032203030303030206e200a30303030303031383339203030303030206e200a30303030303031393632203030303030206e200a30303030303032303931203030303030206e200a30303030303032323233203030303030206e200a30303030303032333539203030303030206e200a30303030303032343837203030303030206e200a30303030303032363134203030303030206e200a30303030303032373433203030303030206e200a30303030303032383736203030303030206e200a30303030303032393738203030303030206e200a30303030303033333232203030303030206e200a30303030303033343038203030303030206e200a747261696c65720a3c3c0a2f53697a652032310a2f526f6f74203230203020520a2f496e666f203139203020520a2f4944205b203c31374637313839464334413238344333323938383930363637373246324445303e203c31374637313839464334413238344333323938383930363637373246324445303e205d0a3e3e0a7374617274787265660a333531320a2525454f46	35	2026-06-21 22:26:18.739188+00	Arq. Carlos Contratista Demo (Contratista), Ing. Sofía Supervisión Demo (Supervisión), Residente de obra
3	26	p´l	2026-06-17	ñl{	pl	\N	\N	\N	\N	\N	35	2026-06-21 23:38:33.968017+00	ñklol
4	38	Reunión de avance mensual	2026-06-07	Sala de juntas de la Residencia	Acelerar la cimentación para no afectar el periodo en curso.	\N	\N	\N	\N	\N	1	2026-06-22 16:50:13.015179+00	Residente, Superintendente y Supervisión
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagos (id, contrato_id, estimacion_id, estimacion_ref, fecha_pago, importe, referencia, factura_cfdi, fecha_factura, fecha_autorizacion, observaciones, registrado_por, created_at) FROM stdin;
8	26	17	Estimación #2	2026-06-21	69500.00	SPEI-2026-000123	A1B2C3D4-1111-2222-3333-444455556666	2026-06-18	\N	Pago de estimación #1 — periodo 1 (prueba E2E final).	18	2026-06-21 23:11:19.424817+00
9	31	18	EST-1	2026-06-21	208500.00	SPEI-0001	CFDI-0001	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
10	32	19	EST-1	2026-06-21	208500.00	SPEI-0001	CFDI-0001	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
11	41	21	EST-1	2026-06-21	208500.00	SPEI-0001	CFDI-0001	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
12	44	26	EST-1	2026-06-21	208500.00	SPEI-0001	CFDI-0001	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
13	46	28	EST-1	2026-06-21	208500.00	SPEI-0001	CFDI-0001	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
14	51	31	EST-1	2026-06-21	208500.00	SPEI-0001	CFDI-0001	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
15	51	32	EST-2	2026-06-21	208500.00	SPEI-0002	CFDI-0002	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
16	51	33	EST-3	2026-06-21	278000.00	SPEI-0003	CFDI-0003	2026-06-20	\N	\N	6	2026-06-22 16:50:13.015179+00
17	27	35	Estimación #1	2026-06-23	16388.10	kgkkgkghkkhghjhjg	..nmn	2026-07-24	2026-07-24	holajk	6	2026-06-23 00:39:38.6268+00
\.


--
-- Data for Name: plan_amortizacion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_amortizacion (id, contrato_id, periodo_numero, monto, created_at) FROM stdin;
151	53	1	8265.60	2026-06-22 17:05:53.683791+00
73	26	1	100000.00	2026-06-21 21:53:40.071664+00
74	26	2	100000.00	2026-06-21 21:53:40.071664+00
75	26	3	100000.00	2026-06-21 21:53:40.071664+00
76	27	1	702.00	2026-06-22 01:11:01.623717+00
77	27	2	4024.80	2026-06-22 01:11:01.623717+00
78	27	3	0.00	2026-06-22 01:11:01.623717+00
79	28	1	90000.00	2026-06-22 16:50:13.015179+00
80	28	2	90000.00	2026-06-22 16:50:13.015179+00
81	28	3	120000.00	2026-06-22 16:50:13.015179+00
82	29	1	90000.00	2026-06-22 16:50:13.015179+00
83	29	2	90000.00	2026-06-22 16:50:13.015179+00
84	29	3	120000.00	2026-06-22 16:50:13.015179+00
85	30	1	90000.00	2026-06-22 16:50:13.015179+00
86	30	2	90000.00	2026-06-22 16:50:13.015179+00
87	30	3	120000.00	2026-06-22 16:50:13.015179+00
88	31	1	90000.00	2026-06-22 16:50:13.015179+00
89	31	2	90000.00	2026-06-22 16:50:13.015179+00
90	31	3	120000.00	2026-06-22 16:50:13.015179+00
91	32	1	90000.00	2026-06-22 16:50:13.015179+00
92	32	2	90000.00	2026-06-22 16:50:13.015179+00
93	32	3	120000.00	2026-06-22 16:50:13.015179+00
94	33	1	90000.00	2026-06-22 16:50:13.015179+00
95	33	2	90000.00	2026-06-22 16:50:13.015179+00
96	33	3	120000.00	2026-06-22 16:50:13.015179+00
97	34	1	90000.00	2026-06-22 16:50:13.015179+00
98	34	2	90000.00	2026-06-22 16:50:13.015179+00
99	34	3	120000.00	2026-06-22 16:50:13.015179+00
100	35	1	90000.00	2026-06-22 16:50:13.015179+00
101	35	2	90000.00	2026-06-22 16:50:13.015179+00
102	35	3	120000.00	2026-06-22 16:50:13.015179+00
103	36	1	90000.00	2026-06-22 16:50:13.015179+00
104	36	2	90000.00	2026-06-22 16:50:13.015179+00
105	36	3	120000.00	2026-06-22 16:50:13.015179+00
106	37	1	90000.00	2026-06-22 16:50:13.015179+00
107	37	2	90000.00	2026-06-22 16:50:13.015179+00
108	37	3	120000.00	2026-06-22 16:50:13.015179+00
109	38	1	90000.00	2026-06-22 16:50:13.015179+00
110	38	2	90000.00	2026-06-22 16:50:13.015179+00
111	38	3	120000.00	2026-06-22 16:50:13.015179+00
112	39	1	90000.00	2026-06-22 16:50:13.015179+00
113	39	2	90000.00	2026-06-22 16:50:13.015179+00
114	39	3	120000.00	2026-06-22 16:50:13.015179+00
115	40	1	90000.00	2026-06-22 16:50:13.015179+00
116	40	2	90000.00	2026-06-22 16:50:13.015179+00
117	40	3	120000.00	2026-06-22 16:50:13.015179+00
118	41	1	90000.00	2026-06-22 16:50:13.015179+00
119	41	2	90000.00	2026-06-22 16:50:13.015179+00
120	41	3	120000.00	2026-06-22 16:50:13.015179+00
121	42	1	90000.00	2026-06-22 16:50:13.015179+00
122	42	2	90000.00	2026-06-22 16:50:13.015179+00
123	42	3	120000.00	2026-06-22 16:50:13.015179+00
124	43	1	90000.00	2026-06-22 16:50:13.015179+00
125	43	2	90000.00	2026-06-22 16:50:13.015179+00
126	43	3	120000.00	2026-06-22 16:50:13.015179+00
127	44	1	90000.00	2026-06-22 16:50:13.015179+00
128	44	2	90000.00	2026-06-22 16:50:13.015179+00
129	44	3	120000.00	2026-06-22 16:50:13.015179+00
130	45	1	90000.00	2026-06-22 16:50:13.015179+00
131	45	2	90000.00	2026-06-22 16:50:13.015179+00
132	45	3	120000.00	2026-06-22 16:50:13.015179+00
133	46	1	90000.00	2026-06-22 16:50:13.015179+00
134	46	2	90000.00	2026-06-22 16:50:13.015179+00
135	46	3	120000.00	2026-06-22 16:50:13.015179+00
136	47	1	90000.00	2026-06-22 16:50:13.015179+00
137	47	2	90000.00	2026-06-22 16:50:13.015179+00
138	47	3	120000.00	2026-06-22 16:50:13.015179+00
139	48	1	90000.00	2026-06-22 16:50:13.015179+00
140	48	2	90000.00	2026-06-22 16:50:13.015179+00
141	48	3	120000.00	2026-06-22 16:50:13.015179+00
142	49	1	90000.00	2026-06-22 16:50:13.015179+00
143	49	2	90000.00	2026-06-22 16:50:13.015179+00
144	49	3	120000.00	2026-06-22 16:50:13.015179+00
145	50	1	90000.00	2026-06-22 16:50:13.015179+00
146	50	2	90000.00	2026-06-22 16:50:13.015179+00
147	50	3	120000.00	2026-06-22 16:50:13.015179+00
148	51	1	90000.00	2026-06-22 16:50:13.015179+00
149	51	2	90000.00	2026-06-22 16:50:13.015179+00
150	51	3	120000.00	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: presupuesto_anual; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.presupuesto_anual (id, ejercicio, dependencia, partida, techo, descripcion, creado_por, created_at, dependencia_id) FROM stdin;
1	2026	Lic. Diana Dependencia Demo	62201	5000000.00	\N	18	2026-06-21 23:03:05.708346+00	4
2	2026	Lic. Diana Herrera Salgado	62201 — Edificación no habitacional	50000000.00	Techo presupuestal del ejercicio 2026 para obra pública educativa.	4	2026-06-22 16:50:13.015179+00	4
\.


--
-- Data for Name: programa_obra; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.programa_obra (id, contrato_concepto_id, contrato_periodo_id, cantidad, created_at) FROM stdin;
158	151	151	1312.000	2026-06-22 17:05:53.683791+00
73	73	73	1000.000	2026-06-21 21:53:40.071664+00
74	74	73	250.000	2026-06-21 21:53:40.071664+00
75	74	74	250.000	2026-06-21 21:53:40.071664+00
76	75	74	150.000	2026-06-21 21:53:40.071664+00
77	75	75	150.000	2026-06-21 21:53:40.071664+00
78	76	74	1000.000	2026-06-21 21:53:40.071664+00
79	76	75	1000.000	2026-06-21 21:53:40.071664+00
82	77	76	524.000	2026-06-22 01:13:14.898427+00
83	78	77	524.000	2026-06-22 01:13:14.898427+00
84	79	79	1000.000	2026-06-22 16:50:13.015179+00
85	80	80	200.000	2026-06-22 16:50:13.015179+00
86	81	81	1.000	2026-06-22 16:50:13.015179+00
87	82	82	1000.000	2026-06-22 16:50:13.015179+00
88	83	83	200.000	2026-06-22 16:50:13.015179+00
89	84	84	1.000	2026-06-22 16:50:13.015179+00
91	86	86	200.000	2026-06-22 16:50:13.015179+00
92	87	87	1.000	2026-06-22 16:50:13.015179+00
90	85	85	1200.000	2026-06-22 16:50:13.015179+00
93	88	88	1000.000	2026-06-22 16:50:13.015179+00
94	89	89	200.000	2026-06-22 16:50:13.015179+00
95	90	90	1.000	2026-06-22 16:50:13.015179+00
96	91	91	1000.000	2026-06-22 16:50:13.015179+00
97	92	92	200.000	2026-06-22 16:50:13.015179+00
98	93	93	1.000	2026-06-22 16:50:13.015179+00
100	95	95	200.000	2026-06-22 16:50:13.015179+00
101	96	96	1.000	2026-06-22 16:50:13.015179+00
102	94	94	600.000	2026-06-22 16:50:13.015179+00
103	94	95	400.000	2026-06-22 16:50:13.015179+00
104	97	97	1000.000	2026-06-22 16:50:13.015179+00
105	98	98	200.000	2026-06-22 16:50:13.015179+00
106	99	99	1.000	2026-06-22 16:50:13.015179+00
107	100	100	1000.000	2026-06-22 16:50:13.015179+00
108	101	101	200.000	2026-06-22 16:50:13.015179+00
109	102	102	1.000	2026-06-22 16:50:13.015179+00
110	103	103	1000.000	2026-06-22 16:50:13.015179+00
111	104	104	200.000	2026-06-22 16:50:13.015179+00
112	105	105	1.000	2026-06-22 16:50:13.015179+00
113	106	106	1000.000	2026-06-22 16:50:13.015179+00
114	107	107	200.000	2026-06-22 16:50:13.015179+00
115	108	108	1.000	2026-06-22 16:50:13.015179+00
116	109	109	1000.000	2026-06-22 16:50:13.015179+00
117	110	110	200.000	2026-06-22 16:50:13.015179+00
118	111	111	1.000	2026-06-22 16:50:13.015179+00
119	112	112	1000.000	2026-06-22 16:50:13.015179+00
120	113	113	200.000	2026-06-22 16:50:13.015179+00
121	114	114	1.000	2026-06-22 16:50:13.015179+00
122	115	115	1000.000	2026-06-22 16:50:13.015179+00
123	116	116	200.000	2026-06-22 16:50:13.015179+00
124	117	117	1.000	2026-06-22 16:50:13.015179+00
125	118	118	1000.000	2026-06-22 16:50:13.015179+00
126	119	119	200.000	2026-06-22 16:50:13.015179+00
127	120	120	1.000	2026-06-22 16:50:13.015179+00
128	121	121	1000.000	2026-06-22 16:50:13.015179+00
129	122	122	200.000	2026-06-22 16:50:13.015179+00
130	123	123	1.000	2026-06-22 16:50:13.015179+00
131	124	124	1000.000	2026-06-22 16:50:13.015179+00
132	125	125	200.000	2026-06-22 16:50:13.015179+00
133	126	126	1.000	2026-06-22 16:50:13.015179+00
134	127	127	1000.000	2026-06-22 16:50:13.015179+00
135	128	128	200.000	2026-06-22 16:50:13.015179+00
136	129	129	1.000	2026-06-22 16:50:13.015179+00
137	130	130	1000.000	2026-06-22 16:50:13.015179+00
138	131	131	200.000	2026-06-22 16:50:13.015179+00
139	132	132	1.000	2026-06-22 16:50:13.015179+00
140	133	133	1000.000	2026-06-22 16:50:13.015179+00
141	134	134	200.000	2026-06-22 16:50:13.015179+00
142	135	135	1.000	2026-06-22 16:50:13.015179+00
143	136	136	1000.000	2026-06-22 16:50:13.015179+00
144	137	137	200.000	2026-06-22 16:50:13.015179+00
145	138	138	1.000	2026-06-22 16:50:13.015179+00
146	139	139	1000.000	2026-06-22 16:50:13.015179+00
147	140	140	200.000	2026-06-22 16:50:13.015179+00
148	141	141	1.000	2026-06-22 16:50:13.015179+00
149	142	142	1000.000	2026-06-22 16:50:13.015179+00
150	143	143	200.000	2026-06-22 16:50:13.015179+00
151	144	144	1.000	2026-06-22 16:50:13.015179+00
152	145	145	1000.000	2026-06-22 16:50:13.015179+00
153	146	146	200.000	2026-06-22 16:50:13.015179+00
154	147	147	1.000	2026-06-22 16:50:13.015179+00
155	148	148	1000.000	2026-06-22 16:50:13.015179+00
156	149	149	200.000	2026-06-22 16:50:13.015179+00
157	150	150	1.000	2026-06-22 16:50:13.015179+00
\.


--
-- Data for Name: programa_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.programa_version (id, contrato_id, numero, convenio_id, monto, plazo_dias, vigente, created_at, supersedido_en) FROM stdin;
2	27	1	\N	15756.00	90	f	2026-06-22 01:13:14.898427+00	2026-06-22 01:13:14.898427+00
3	27	2	3	158772.00	1000	t	2026-06-22 01:13:14.898427+00	\N
4	30	1	\N	1000000.00	90	f	2026-06-22 16:50:13.015179+00	2026-06-22 16:50:13.015179+00
5	30	2	4	1060000.00	90	t	2026-06-22 16:50:13.015179+00	\N
\.


--
-- Data for Name: programa_version_celda; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.programa_version_celda (id, programa_version_id, concepto_clave, periodo_numero, periodo_inicio, periodo_fin, cantidad) FROM stdin;
3	2	dsa	1	2026-06-15	2026-07-14	52.000
4	2	dsf	2	2026-07-15	2026-08-14	52.000
5	3	dsa	1	2026-06-15	2026-07-14	524.000
6	3	dsf	2	2026-07-15	2026-08-14	524.000
7	4	CONC-01	1	2026-04-23	2026-05-22	1000.000
8	4	CONC-02	2	2026-05-23	2026-06-21	200.000
9	4	CONC-03	3	2026-06-22	2026-07-21	1.000
10	5	CONC-02	2	2026-05-23	2026-06-21	200.000
11	5	CONC-03	3	2026-06-22	2026-07-21	1.000
12	5	CONC-01	1	2026-04-23	2026-05-22	1200.000
\.


--
-- Data for Name: programa_version_concepto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.programa_version_concepto (id, programa_version_id, clave, concepto, unidad, cantidad, pu, orden) FROM stdin;
3	2	dsa	ads	m³	52.000	45.0000	1
4	2	dsf	hgfh	cm	52.000	258.0000	2
5	3	dsa	ads	m³	524.000	45.0000	1
6	3	dsf	hgfh	cm	524.000	258.0000	2
7	4	CONC-01	Terracerías y movimiento de tierras	m3	1000.000	300.0000	1
8	4	CONC-02	Cimentación	m3	200.000	1500.0000	2
9	4	CONC-03	Estructura y obra negra	lote	1.000	400000.0000	3
10	5	CONC-01	Terracerías y movimiento de tierras	m3	1200.000	300.0000	1
11	5	CONC-02	Cimentación	m3	200.000	1500.0000	2
12	5	CONC-03	Estructura y obra negra	lote	1.000	400000.0000	3
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, email, password_hash, rol, created_at, estado, rol_solicitado, aprobado_por, aprobado_en, empresa_id) FROM stdin;
5	Profesor (Sistemas)	csilvasa@ipn.mx	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	residente	2026-06-21 19:31:25.21579+00	activo	\N	\N	\N	1
7	Ing. Marco Superintendente 2	super2.demo@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	contratista	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	2
8	Ing. Laura Superintendente 3	super3.demo@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	contratista	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	2
9	Ing. Pedro Patito	patito1@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	contratista	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	5
10	Ing. Paola Patito	patito2@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	contratista	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	5
11	Ing. Raúl Residente 2	residente2.demo@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	residente	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	1
12	Lic. Diana Dependencia Sur	dependencia.sur@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	dependencia	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	4
13	Ing. Iván Residente Sur	residente.sur@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	residente	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	4
14	Arq. Sergio Supervisión 2	superv2.demo@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	supervision	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	3
15	Arq. Silvia Supervisión Sur	superv.sur@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	supervision	2026-06-21 19:32:38.277926+00	activo	\N	\N	\N	6
16	Lic. Norma Dependencia Norte	dep2@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	dependencia	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	7
17	Ing. Néstor Residente Norte	residente.norte@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	residente	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	7
18	C.P. Nadia Finanzas Norte	finanzas.norte@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	finanzas	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	7
19	C.P. Susana Finanzas Sur	finanzas.sur@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	finanzas	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	4
20	Ing. Patricia Pacífico	pacifico1@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	contratista	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	8
21	Ing. Pablo Pacífico	pacifico2@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	contratista	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	8
22	Arq. Nadia Supervisión Norte	superv.norte@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	supervision	2026-06-21 19:32:39.401234+00	activo	\N	\N	\N	9
35	ivan Lopez Garcia	chocovan392@gmail.com	$2a$10$.a6SBmfRmEzuLYD774e.dOfXvwxp6OQ2hZJsfF.3A/MGzKtt9Vsva	residente	2026-06-21 21:34:00.104826+00	activo	residente	4	2026-06-21 21:34:52.63847+00	11
78	mike candelario suarez	mike@gmail.com	$2a$10$u/VSngbmJqrgEijHIG/50OvRZcNjIWCUpFUjbbDUR4ALQC7bOc9ta	\N	2026-06-22 16:09:39.00326+00	pendiente	residente	\N	\N	13
79	adssa adsads	dsadsa@gmail.com	$2a$10$/zsNZRdllJAnSmSwyfd0ueqNjEMW73eUeD08CM1GjzHTLU9e1k0YS	\N	2026-06-22 16:18:55.186968+00	pendiente	contratista	\N	\N	14
2	Ing. Carlos Méndez Rivera	contratista@sigecop.test	$2a$10$h7eLpWBwF5O3smp/egT3wupSylCFRXlwQQIeHbnvCdJOmM5xAhdgK	contratista	2026-06-21 19:31:25.21579+00	activo	\N	\N	\N	2
1	Ing. Roberto Salazar Gómez	residente@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	residente	2026-06-21 19:31:25.21579+00	activo	\N	\N	\N	1
3	Arq. Mónica Vázquez Lara	supervision@sigecop.test	$2a$10$zpUoEVcL3IZhAtpS4kexoemneAaX93X7.A3kbLPYOBwgw51eZC33e	supervision	2026-06-21 19:31:25.21579+00	activo	\N	\N	\N	3
4	Lic. Diana Herrera Salgado	dependencia@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	dependencia	2026-06-21 19:31:25.21579+00	activo	\N	\N	\N	1
6	C.P. Fernando Ríos Aguilar	finanzas@sigecop.test	$2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy	finanzas	2026-06-21 19:31:25.21579+00	activo	\N	\N	\N	1
\.


--
-- Data for Name: visitas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.visitas (id, contrato_id, tipo, fecha_programada, fecha_realizada, proposito, resultado, estado, registrada_por, created_at, lugar, responsable, nota_id) FROM stdin;
2	26	visita	2026-01-20	\N	Verificación física del avance del primer periodo previo a estimación #1.	\N	agendada	35	2026-06-21 22:31:20.993861+00	Frente de obra norte — Av. Juárez s/n, Chilpancingo, Gro.	Ing. Sofía Supervisión Demo	\N
3	38	visita	2026-06-29	\N	Verificar armado y niveles antes del colado.	\N	agendada	\N	2026-06-22 16:50:13.015179+00	Frente de obra — cimentación	Supervisión	\N
\.


--
-- Name: alerta_atraso_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.alerta_atraso_id_seq', 1, false);


--
-- Name: atraso_asentado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.atraso_asentado_id_seq', 2, true);


--
-- Name: bitacora_aperturas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bitacora_aperturas_id_seq', 41, true);


--
-- Name: bitacora_firmantes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bitacora_firmantes_id_seq', 123, true);


--
-- Name: bitacora_nota_firmas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bitacora_nota_firmas_id_seq', 139, true);


--
-- Name: bitacora_notas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bitacora_notas_id_seq', 68, true);


--
-- Name: concepto_avance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.concepto_avance_id_seq', 51, true);


--
-- Name: contrato_actividades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_actividades_id_seq', 1, false);


--
-- Name: contrato_conceptos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_conceptos_id_seq', 151, true);


--
-- Name: contrato_documentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_documentos_id_seq', 4, true);


--
-- Name: contrato_garantias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_garantias_id_seq', 152, true);


--
-- Name: contrato_periodos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_periodos_id_seq', 151, true);


--
-- Name: contrato_roster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contrato_roster_id_seq', 154, true);


--
-- Name: contratos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contratos_id_seq', 53, true);


--
-- Name: convenios_modificatorios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.convenios_modificatorios_id_seq', 4, true);


--
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empresas_id_seq', 16, true);


--
-- Name: estimacion_fotos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estimacion_fotos_id_seq', 1, false);


--
-- Name: estimacion_generadores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estimacion_generadores_id_seq', 37, true);


--
-- Name: estimacion_observaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estimacion_observaciones_id_seq', 14, true);


--
-- Name: estimacion_soportes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estimacion_soportes_id_seq', 4, true);


--
-- Name: estimaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estimaciones_id_seq', 35, true);


--
-- Name: finiquitos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.finiquitos_id_seq', 2, true);


--
-- Name: garantia_endosos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.garantia_endosos_id_seq', 4, true);


--
-- Name: instruccion_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.instruccion_pago_id_seq', 2, true);


--
-- Name: minutas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.minutas_id_seq', 4, true);


--
-- Name: pagos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pagos_id_seq', 17, true);


--
-- Name: plan_amortizacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_amortizacion_id_seq', 151, true);


--
-- Name: presupuesto_anual_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.presupuesto_anual_id_seq', 2, true);


--
-- Name: programa_obra_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programa_obra_id_seq', 158, true);


--
-- Name: programa_version_celda_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programa_version_celda_id_seq', 12, true);


--
-- Name: programa_version_concepto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programa_version_concepto_id_seq', 12, true);


--
-- Name: programa_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programa_version_id_seq', 5, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 109, true);


--
-- Name: visitas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.visitas_id_seq', 3, true);


--
-- Name: alerta_atraso alerta_atraso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_atraso
    ADD CONSTRAINT alerta_atraso_pkey PRIMARY KEY (id);


--
-- Name: atraso_asentado atraso_asentado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atraso_asentado
    ADD CONSTRAINT atraso_asentado_pkey PRIMARY KEY (id);


--
-- Name: bitacora_aperturas bitacora_aperturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_aperturas
    ADD CONSTRAINT bitacora_aperturas_pkey PRIMARY KEY (id);


--
-- Name: bitacora_firmantes bitacora_firmantes_bitacora_id_parte_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_firmantes
    ADD CONSTRAINT bitacora_firmantes_bitacora_id_parte_key UNIQUE (bitacora_id, parte);


--
-- Name: bitacora_firmantes bitacora_firmantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_firmantes
    ADD CONSTRAINT bitacora_firmantes_pkey PRIMARY KEY (id);


--
-- Name: bitacora_nota_firmas bitacora_nota_firmas_nota_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_nota_firmas
    ADD CONSTRAINT bitacora_nota_firmas_nota_id_usuario_id_key UNIQUE (nota_id, usuario_id);


--
-- Name: bitacora_nota_firmas bitacora_nota_firmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_nota_firmas
    ADD CONSTRAINT bitacora_nota_firmas_pkey PRIMARY KEY (id);


--
-- Name: bitacora_nota_tipos bitacora_nota_tipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_nota_tipos
    ADD CONSTRAINT bitacora_nota_tipos_pkey PRIMARY KEY (clave);


--
-- Name: bitacora_notas bitacora_notas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas
    ADD CONSTRAINT bitacora_notas_pkey PRIMARY KEY (id);


--
-- Name: concepto_avance concepto_avance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_pkey PRIMARY KEY (id);


--
-- Name: contrato_actividades contrato_actividades_contrato_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_actividades
    ADD CONSTRAINT contrato_actividades_contrato_id_orden_key UNIQUE (contrato_id, orden);


--
-- Name: contrato_actividades contrato_actividades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_actividades
    ADD CONSTRAINT contrato_actividades_pkey PRIMARY KEY (id);


--
-- Name: contrato_conceptos contrato_conceptos_contrato_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_conceptos
    ADD CONSTRAINT contrato_conceptos_contrato_id_orden_key UNIQUE (contrato_id, orden);


--
-- Name: contrato_conceptos contrato_conceptos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_conceptos
    ADD CONSTRAINT contrato_conceptos_pkey PRIMARY KEY (id);


--
-- Name: contrato_documentos contrato_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_documentos
    ADD CONSTRAINT contrato_documentos_pkey PRIMARY KEY (id);


--
-- Name: contrato_garantias contrato_garantias_contrato_id_tipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_garantias
    ADD CONSTRAINT contrato_garantias_contrato_id_tipo_key UNIQUE (contrato_id, tipo);


--
-- Name: contrato_garantias contrato_garantias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_garantias
    ADD CONSTRAINT contrato_garantias_pkey PRIMARY KEY (id);


--
-- Name: contrato_periodos contrato_periodos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_periodos
    ADD CONSTRAINT contrato_periodos_pkey PRIMARY KEY (id);


--
-- Name: contrato_roster contrato_roster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster
    ADD CONSTRAINT contrato_roster_pkey PRIMARY KEY (id);


--
-- Name: contratos contratos_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_folio_key UNIQUE (folio);


--
-- Name: contratos contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);


--
-- Name: convenios_modificatorios convenios_modificatorios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios_modificatorios
    ADD CONSTRAINT convenios_modificatorios_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: estimacion_fotos estimacion_fotos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_fotos
    ADD CONSTRAINT estimacion_fotos_pkey PRIMARY KEY (id);


--
-- Name: estimacion_generadores estimacion_generadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_generadores
    ADD CONSTRAINT estimacion_generadores_pkey PRIMARY KEY (id);


--
-- Name: estimacion_notas estimacion_notas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_notas
    ADD CONSTRAINT estimacion_notas_pkey PRIMARY KEY (estimacion_id, nota_id);


--
-- Name: estimacion_observaciones estimacion_observaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_observaciones
    ADD CONSTRAINT estimacion_observaciones_pkey PRIMARY KEY (id);


--
-- Name: estimacion_soportes estimacion_soportes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_soportes
    ADD CONSTRAINT estimacion_soportes_pkey PRIMARY KEY (id);


--
-- Name: estimaciones estimaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT estimaciones_pkey PRIMARY KEY (id);


--
-- Name: finiquitos finiquitos_contrato_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finiquitos
    ADD CONSTRAINT finiquitos_contrato_id_key UNIQUE (contrato_id);


--
-- Name: finiquitos finiquitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finiquitos
    ADD CONSTRAINT finiquitos_pkey PRIMARY KEY (id);


--
-- Name: garantia_endosos garantia_endosos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia_endosos
    ADD CONSTRAINT garantia_endosos_pkey PRIMARY KEY (id);


--
-- Name: instruccion_pago instruccion_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruccion_pago
    ADD CONSTRAINT instruccion_pago_pkey PRIMARY KEY (id);


--
-- Name: minutas minutas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minutas
    ADD CONSTRAINT minutas_pkey PRIMARY KEY (id);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- Name: plan_amortizacion plan_amortizacion_contrato_id_periodo_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amortizacion
    ADD CONSTRAINT plan_amortizacion_contrato_id_periodo_numero_key UNIQUE (contrato_id, periodo_numero);


--
-- Name: plan_amortizacion plan_amortizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amortizacion
    ADD CONSTRAINT plan_amortizacion_pkey PRIMARY KEY (id);


--
-- Name: presupuesto_anual presupuesto_anual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_anual
    ADD CONSTRAINT presupuesto_anual_pkey PRIMARY KEY (id);


--
-- Name: programa_obra programa_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_obra
    ADD CONSTRAINT programa_obra_pkey PRIMARY KEY (id);


--
-- Name: programa_version_celda programa_version_celda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version_celda
    ADD CONSTRAINT programa_version_celda_pkey PRIMARY KEY (id);


--
-- Name: programa_version_concepto programa_version_concepto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version_concepto
    ADD CONSTRAINT programa_version_concepto_pkey PRIMARY KEY (id);


--
-- Name: programa_version programa_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version
    ADD CONSTRAINT programa_version_pkey PRIMARY KEY (id);


--
-- Name: bitacora_aperturas uq_bitacora_aperturas_contrato; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_aperturas
    ADD CONSTRAINT uq_bitacora_aperturas_contrato UNIQUE (contrato_id);


--
-- Name: bitacora_firmantes uq_bitacora_firmantes_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_firmantes
    ADD CONSTRAINT uq_bitacora_firmantes_usuario UNIQUE (bitacora_id, usuario_id);


--
-- Name: bitacora_notas uq_bitacora_notas_folio; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas
    ADD CONSTRAINT uq_bitacora_notas_folio UNIQUE (bitacora_id, numero);


--
-- Name: contrato_conceptos uq_contrato_conceptos_clave; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_conceptos
    ADD CONSTRAINT uq_contrato_conceptos_clave UNIQUE (contrato_id, clave);


--
-- Name: contrato_periodos uq_contrato_periodos_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_periodos
    ADD CONSTRAINT uq_contrato_periodos_numero UNIQUE (contrato_id, numero);


--
-- Name: convenios_modificatorios uq_convenios_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios_modificatorios
    ADD CONSTRAINT uq_convenios_numero UNIQUE (contrato_id, numero);


--
-- Name: estimacion_generadores uq_estimacion_generadores_concepto; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_generadores
    ADD CONSTRAINT uq_estimacion_generadores_concepto UNIQUE (estimacion_id, contrato_concepto_id);


--
-- Name: estimaciones uq_estimaciones_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT uq_estimaciones_numero UNIQUE (contrato_id, numero);


--
-- Name: estimaciones uq_estimaciones_reemplaza_a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT uq_estimaciones_reemplaza_a UNIQUE (reemplaza_a);


--
-- Name: instruccion_pago uq_instruccion_pago_estimacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruccion_pago
    ADD CONSTRAINT uq_instruccion_pago_estimacion UNIQUE (estimacion_id);


--
-- Name: presupuesto_anual uq_presupuesto_anual_fk_partida; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_anual
    ADD CONSTRAINT uq_presupuesto_anual_fk_partida UNIQUE (ejercicio, dependencia_id, partida);


--
-- Name: programa_obra uq_programa_obra_celda; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_obra
    ADD CONSTRAINT uq_programa_obra_celda UNIQUE (contrato_concepto_id, contrato_periodo_id);


--
-- Name: programa_version uq_programa_version_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version
    ADD CONSTRAINT uq_programa_version_numero UNIQUE (contrato_id, numero);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: visitas visitas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_pkey PRIMARY KEY (id);


--
-- Name: idx_alerta_atraso_concepto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerta_atraso_concepto ON public.alerta_atraso USING btree (contrato_concepto_id);


--
-- Name: idx_atraso_asentado_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_atraso_asentado_nota ON public.atraso_asentado USING btree (nota_id);


--
-- Name: idx_bitacora_aperturas_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_aperturas_contrato ON public.bitacora_aperturas USING btree (contrato_id);


--
-- Name: idx_bitacora_firmantes_bitacora; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_firmantes_bitacora ON public.bitacora_firmantes USING btree (bitacora_id);


--
-- Name: idx_bitacora_firmantes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_firmantes_usuario ON public.bitacora_firmantes USING btree (usuario_id);


--
-- Name: idx_bitacora_nota_firmas_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_nota_firmas_nota ON public.bitacora_nota_firmas USING btree (nota_id);


--
-- Name: idx_bitacora_notas_bitacora; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_notas_bitacora ON public.bitacora_notas USING btree (bitacora_id);


--
-- Name: idx_bitacora_notas_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_notas_tag ON public.bitacora_notas USING btree (tag);


--
-- Name: idx_bitacora_notas_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_notas_tipo ON public.bitacora_notas USING btree (tipo);


--
-- Name: idx_bitacora_notas_vinculada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_notas_vinculada ON public.bitacora_notas USING btree (vinculada_a);


--
-- Name: idx_concepto_avance_concepto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concepto_avance_concepto ON public.concepto_avance USING btree (contrato_concepto_id);


--
-- Name: idx_concepto_avance_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concepto_avance_nota ON public.concepto_avance USING btree (nota_id);


--
-- Name: idx_concepto_avance_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concepto_avance_periodo ON public.concepto_avance USING btree (contrato_periodo_id);


--
-- Name: idx_concepto_avance_reemplaza; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_concepto_avance_reemplaza ON public.concepto_avance USING btree (reemplaza_a);


--
-- Name: idx_contrato_actividades_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_actividades_contrato ON public.contrato_actividades USING btree (contrato_id);


--
-- Name: idx_contrato_conceptos_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_conceptos_contrato ON public.contrato_conceptos USING btree (contrato_id);


--
-- Name: idx_contrato_documentos_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_documentos_contrato ON public.contrato_documentos USING btree (contrato_id);


--
-- Name: idx_contrato_documentos_convenio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_documentos_convenio ON public.contrato_documentos USING btree (convenio_id);


--
-- Name: idx_contrato_garantias_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_garantias_contrato ON public.contrato_garantias USING btree (contrato_id);


--
-- Name: idx_contrato_garantias_vigencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_garantias_vigencia ON public.contrato_garantias USING btree (vigencia);


--
-- Name: idx_contrato_periodos_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_periodos_contrato ON public.contrato_periodos USING btree (contrato_id);


--
-- Name: idx_contrato_roster_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_roster_contrato ON public.contrato_roster USING btree (contrato_id);


--
-- Name: idx_contrato_roster_sustituye; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_roster_sustituye ON public.contrato_roster USING btree (sustituye_a);


--
-- Name: idx_contrato_roster_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrato_roster_usuario ON public.contrato_roster USING btree (usuario_id);


--
-- Name: idx_contratos_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_created_by ON public.contratos USING btree (created_by);


--
-- Name: idx_contratos_dependencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_dependencia_id ON public.contratos USING btree (dependencia_id);


--
-- Name: idx_contratos_folio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_folio ON public.contratos USING btree (folio);


--
-- Name: idx_contratos_residente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_residente ON public.contratos USING btree (residente_id);


--
-- Name: idx_contratos_superintendente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_superintendente ON public.contratos USING btree (superintendente_id);


--
-- Name: idx_contratos_supervision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_supervision ON public.contratos USING btree (supervision_id);


--
-- Name: idx_convenios_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_convenios_contrato ON public.convenios_modificatorios USING btree (contrato_id);


--
-- Name: idx_convenios_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_convenios_estado ON public.convenios_modificatorios USING btree (contrato_id, estado);


--
-- Name: idx_convenios_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_convenios_nota ON public.convenios_modificatorios USING btree (nota_id);


--
-- Name: idx_estimacion_fotos_estimacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_fotos_estimacion ON public.estimacion_fotos USING btree (estimacion_id);


--
-- Name: idx_estimacion_generadores_concepto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_generadores_concepto ON public.estimacion_generadores USING btree (contrato_concepto_id);


--
-- Name: idx_estimacion_generadores_estimacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_generadores_estimacion ON public.estimacion_generadores USING btree (estimacion_id);


--
-- Name: idx_estimacion_notas_estimacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_notas_estimacion ON public.estimacion_notas USING btree (estimacion_id);


--
-- Name: idx_estimacion_notas_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_notas_nota ON public.estimacion_notas USING btree (nota_id);


--
-- Name: idx_estimacion_observaciones_est; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_observaciones_est ON public.estimacion_observaciones USING btree (estimacion_id);


--
-- Name: idx_estimacion_soportes_estimacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimacion_soportes_estimacion ON public.estimacion_soportes USING btree (estimacion_id);


--
-- Name: idx_estimaciones_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimaciones_contrato ON public.estimaciones USING btree (contrato_id);


--
-- Name: idx_estimaciones_reemplaza_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimaciones_reemplaza_a ON public.estimaciones USING btree (reemplaza_a);


--
-- Name: idx_finiquitos_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finiquitos_contrato ON public.finiquitos USING btree (contrato_id);


--
-- Name: idx_garantia_endosos_convenio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_garantia_endosos_convenio ON public.garantia_endosos USING btree (convenio_id);


--
-- Name: idx_garantia_endosos_garantia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_garantia_endosos_garantia ON public.garantia_endosos USING btree (garantia_id);


--
-- Name: idx_instruccion_pago_estimacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruccion_pago_estimacion ON public.instruccion_pago USING btree (estimacion_id);


--
-- Name: idx_instruccion_pago_presupuesto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruccion_pago_presupuesto ON public.instruccion_pago USING btree (presupuesto_anual_id);


--
-- Name: idx_minutas_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minutas_contrato ON public.minutas USING btree (contrato_id);


--
-- Name: idx_minutas_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_minutas_nota ON public.minutas USING btree (nota_id);


--
-- Name: idx_pagos_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_contrato ON public.pagos USING btree (contrato_id);


--
-- Name: idx_plan_amortizacion_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_amortizacion_contrato ON public.plan_amortizacion USING btree (contrato_id);


--
-- Name: idx_presupuesto_anual_dependencia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presupuesto_anual_dependencia_id ON public.presupuesto_anual USING btree (dependencia_id);


--
-- Name: idx_programa_obra_concepto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programa_obra_concepto ON public.programa_obra USING btree (contrato_concepto_id);


--
-- Name: idx_programa_obra_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programa_obra_periodo ON public.programa_obra USING btree (contrato_periodo_id);


--
-- Name: idx_programa_version_celda_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programa_version_celda_ver ON public.programa_version_celda USING btree (programa_version_id);


--
-- Name: idx_programa_version_concepto_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programa_version_concepto_ver ON public.programa_version_concepto USING btree (programa_version_id);


--
-- Name: idx_programa_version_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programa_version_contrato ON public.programa_version USING btree (contrato_id);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_empresa ON public.usuarios USING btree (empresa_id);


--
-- Name: idx_usuarios_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_estado ON public.usuarios USING btree (estado);


--
-- Name: idx_visitas_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitas_contrato ON public.visitas USING btree (contrato_id);


--
-- Name: uq_atraso_asentado; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_atraso_asentado ON public.atraso_asentado USING btree (contrato_concepto_id, periodo_numero);


--
-- Name: uq_contrato_doc_oficio_convenio; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_contrato_doc_oficio_convenio ON public.contrato_documentos USING btree (convenio_id) WHERE (convenio_id IS NOT NULL);


--
-- Name: uq_contrato_doc_singleton; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_contrato_doc_singleton ON public.contrato_documentos USING btree (contrato_id, tipo) WHERE ((tipo)::text = ANY ((ARRAY['contrato'::character varying, 'anticipo_autorizacion'::character varying])::text[]));


--
-- Name: uq_contrato_roster_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_contrato_roster_activo ON public.contrato_roster USING btree (contrato_id, rol) WHERE (vigencia_hasta IS NULL);


--
-- Name: uq_empresas_nombre_norm; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_empresas_nombre_norm ON public.empresas USING btree (lower(btrim(regexp_replace((nombre)::text, '\s+'::text, ' '::text, 'g'::text))));


--
-- Name: uq_pagos_estimacion; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pagos_estimacion ON public.pagos USING btree (estimacion_id) WHERE (estimacion_id IS NOT NULL);


--
-- Name: uq_programa_version_vigente; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_programa_version_vigente ON public.programa_version USING btree (contrato_id) WHERE vigente;


--
-- Name: bitacora_aperturas trg_bitacora_aperturas_inalterable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bitacora_aperturas_inalterable BEFORE UPDATE ON public.bitacora_aperturas FOR EACH ROW EXECUTE FUNCTION public.sigecop_bitacora_inalterable();


--
-- Name: bitacora_firmantes trg_bitacora_firmantes_transicion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bitacora_firmantes_transicion BEFORE UPDATE ON public.bitacora_firmantes FOR EACH ROW EXECUTE FUNCTION public.sigecop_firma_transicion();


--
-- Name: bitacora_nota_firmas trg_bitacora_nota_firmas_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bitacora_nota_firmas_inmutable BEFORE UPDATE ON public.bitacora_nota_firmas FOR EACH ROW EXECUTE FUNCTION public.sigecop_nota_firma_inmutable();


--
-- Name: bitacora_notas trg_bitacora_notas_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bitacora_notas_inmutable BEFORE UPDATE ON public.bitacora_notas FOR EACH ROW EXECUTE FUNCTION public.sigecop_nota_inmutable();


--
-- Name: concepto_avance trg_concepto_avance_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_concepto_avance_inmutable BEFORE UPDATE ON public.concepto_avance FOR EACH ROW EXECUTE FUNCTION public.sigecop_avance_inmutable();


--
-- Name: contrato_documentos trg_contrato_documentos_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contrato_documentos_append_only BEFORE UPDATE ON public.contrato_documentos FOR EACH ROW EXECUTE FUNCTION public.sigecop_documento_inmutable();


--
-- Name: contrato_roster trg_contrato_roster_transicion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contrato_roster_transicion BEFORE UPDATE ON public.contrato_roster FOR EACH ROW EXECUTE FUNCTION public.sigecop_roster_transicion();


--
-- Name: convenios_modificatorios trg_convenio_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_convenio_inmutable BEFORE UPDATE ON public.convenios_modificatorios FOR EACH ROW EXECUTE FUNCTION public.sigecop_convenio_inmutable();


--
-- Name: estimacion_generadores trg_estimacion_generador_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_estimacion_generador_inmutable BEFORE UPDATE ON public.estimacion_generadores FOR EACH ROW EXECUTE FUNCTION public.sigecop_estimacion_generador_inmutable();


--
-- Name: estimaciones trg_estimacion_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_estimacion_inmutable BEFORE UPDATE ON public.estimaciones FOR EACH ROW EXECUTE FUNCTION public.sigecop_estimacion_inmutable();


--
-- Name: finiquitos trg_finiquito_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_finiquito_inmutable BEFORE UPDATE ON public.finiquitos FOR EACH ROW EXECUTE FUNCTION public.sigecop_finiquito_inmutable();


--
-- Name: garantia_endosos trg_garantia_endosos_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_garantia_endosos_inmutable BEFORE UPDATE ON public.garantia_endosos FOR EACH ROW EXECUTE FUNCTION public.sigecop_garantia_endoso_inmutable();


--
-- Name: pagos trg_pago_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pago_inmutable BEFORE UPDATE ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.sigecop_pago_inmutable();


--
-- Name: programa_version trg_programa_version_transicion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_programa_version_transicion BEFORE UPDATE ON public.programa_version FOR EACH ROW EXECUTE FUNCTION public.sigecop_programa_version_transicion();


--
-- Name: alerta_atraso alerta_atraso_contrato_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_atraso
    ADD CONSTRAINT alerta_atraso_contrato_concepto_id_fkey FOREIGN KEY (contrato_concepto_id) REFERENCES public.contrato_conceptos(id) ON DELETE CASCADE;


--
-- Name: alerta_atraso alerta_atraso_creada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerta_atraso
    ADD CONSTRAINT alerta_atraso_creada_por_fkey FOREIGN KEY (creada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: atraso_asentado atraso_asentado_asentado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atraso_asentado
    ADD CONSTRAINT atraso_asentado_asentado_por_fkey FOREIGN KEY (asentado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: atraso_asentado atraso_asentado_contrato_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atraso_asentado
    ADD CONSTRAINT atraso_asentado_contrato_concepto_id_fkey FOREIGN KEY (contrato_concepto_id) REFERENCES public.contrato_conceptos(id) ON DELETE CASCADE;


--
-- Name: atraso_asentado atraso_asentado_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atraso_asentado
    ADD CONSTRAINT atraso_asentado_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: bitacora_aperturas bitacora_aperturas_aperturada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_aperturas
    ADD CONSTRAINT bitacora_aperturas_aperturada_por_fkey FOREIGN KEY (aperturada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: bitacora_aperturas bitacora_aperturas_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_aperturas
    ADD CONSTRAINT bitacora_aperturas_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: bitacora_firmantes bitacora_firmantes_bitacora_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_firmantes
    ADD CONSTRAINT bitacora_firmantes_bitacora_id_fkey FOREIGN KEY (bitacora_id) REFERENCES public.bitacora_aperturas(id) ON DELETE CASCADE;


--
-- Name: bitacora_firmantes bitacora_firmantes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_firmantes
    ADD CONSTRAINT bitacora_firmantes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: bitacora_nota_firmas bitacora_nota_firmas_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_nota_firmas
    ADD CONSTRAINT bitacora_nota_firmas_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id) ON DELETE CASCADE;


--
-- Name: bitacora_nota_firmas bitacora_nota_firmas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_nota_firmas
    ADD CONSTRAINT bitacora_nota_firmas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: bitacora_notas bitacora_notas_bitacora_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas
    ADD CONSTRAINT bitacora_notas_bitacora_id_fkey FOREIGN KEY (bitacora_id) REFERENCES public.bitacora_aperturas(id) ON DELETE CASCADE;


--
-- Name: bitacora_notas bitacora_notas_emisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas
    ADD CONSTRAINT bitacora_notas_emisor_id_fkey FOREIGN KEY (emisor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: bitacora_notas bitacora_notas_vinculada_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas
    ADD CONSTRAINT bitacora_notas_vinculada_a_fkey FOREIGN KEY (vinculada_a) REFERENCES public.bitacora_notas(id) ON DELETE SET NULL;


--
-- Name: concepto_avance concepto_avance_anulada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_anulada_por_fkey FOREIGN KEY (anulada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: concepto_avance concepto_avance_contrato_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_contrato_concepto_id_fkey FOREIGN KEY (contrato_concepto_id) REFERENCES public.contrato_conceptos(id) ON DELETE CASCADE;


--
-- Name: concepto_avance concepto_avance_contrato_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_contrato_periodo_id_fkey FOREIGN KEY (contrato_periodo_id) REFERENCES public.contrato_periodos(id) ON DELETE SET NULL;


--
-- Name: concepto_avance concepto_avance_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: concepto_avance concepto_avance_reemplaza_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_reemplaza_a_fkey FOREIGN KEY (reemplaza_a) REFERENCES public.concepto_avance(id);


--
-- Name: concepto_avance concepto_avance_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concepto_avance
    ADD CONSTRAINT concepto_avance_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contrato_actividades contrato_actividades_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_actividades
    ADD CONSTRAINT contrato_actividades_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: contrato_conceptos contrato_conceptos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_conceptos
    ADD CONSTRAINT contrato_conceptos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: contrato_documentos contrato_documentos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_documentos
    ADD CONSTRAINT contrato_documentos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: contrato_documentos contrato_documentos_convenio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_documentos
    ADD CONSTRAINT contrato_documentos_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES public.convenios_modificatorios(id) ON DELETE CASCADE;


--
-- Name: contrato_garantias contrato_garantias_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_garantias
    ADD CONSTRAINT contrato_garantias_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: contrato_garantias contrato_garantias_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_garantias
    ADD CONSTRAINT contrato_garantias_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contrato_periodos contrato_periodos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_periodos
    ADD CONSTRAINT contrato_periodos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: contrato_roster contrato_roster_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster
    ADD CONSTRAINT contrato_roster_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: contrato_roster contrato_roster_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster
    ADD CONSTRAINT contrato_roster_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: contrato_roster contrato_roster_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster
    ADD CONSTRAINT contrato_roster_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contrato_roster contrato_roster_sustituye_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster
    ADD CONSTRAINT contrato_roster_sustituye_a_fkey FOREIGN KEY (sustituye_a) REFERENCES public.contrato_roster(id);


--
-- Name: contrato_roster contrato_roster_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_roster
    ADD CONSTRAINT contrato_roster_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: contratos contratos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_residente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_residente_id_fkey FOREIGN KEY (residente_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_superintendente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_superintendente_id_fkey FOREIGN KEY (superintendente_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_supervision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_supervision_id_fkey FOREIGN KEY (supervision_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: convenios_modificatorios convenios_modificatorios_autorizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios_modificatorios
    ADD CONSTRAINT convenios_modificatorios_autorizado_por_fkey FOREIGN KEY (autorizado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: convenios_modificatorios convenios_modificatorios_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios_modificatorios
    ADD CONSTRAINT convenios_modificatorios_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: convenios_modificatorios convenios_modificatorios_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convenios_modificatorios
    ADD CONSTRAINT convenios_modificatorios_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: estimacion_fotos estimacion_fotos_estimacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_fotos
    ADD CONSTRAINT estimacion_fotos_estimacion_id_fkey FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id) ON DELETE CASCADE;


--
-- Name: estimacion_fotos estimacion_fotos_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_fotos
    ADD CONSTRAINT estimacion_fotos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.usuarios(id);


--
-- Name: estimacion_generadores estimacion_generadores_contrato_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_generadores
    ADD CONSTRAINT estimacion_generadores_contrato_concepto_id_fkey FOREIGN KEY (contrato_concepto_id) REFERENCES public.contrato_conceptos(id);


--
-- Name: estimacion_generadores estimacion_generadores_estimacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_generadores
    ADD CONSTRAINT estimacion_generadores_estimacion_id_fkey FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id) ON DELETE CASCADE;


--
-- Name: estimacion_notas estimacion_notas_estimacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_notas
    ADD CONSTRAINT estimacion_notas_estimacion_id_fkey FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id) ON DELETE CASCADE;


--
-- Name: estimacion_notas estimacion_notas_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_notas
    ADD CONSTRAINT estimacion_notas_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: estimacion_observaciones estimacion_observaciones_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_observaciones
    ADD CONSTRAINT estimacion_observaciones_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: estimacion_observaciones estimacion_observaciones_estimacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_observaciones
    ADD CONSTRAINT estimacion_observaciones_estimacion_id_fkey FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id) ON DELETE CASCADE;


--
-- Name: estimacion_soportes estimacion_soportes_estimacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimacion_soportes
    ADD CONSTRAINT estimacion_soportes_estimacion_id_fkey FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id) ON DELETE CASCADE;


--
-- Name: estimaciones estimaciones_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT estimaciones_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: estimaciones estimaciones_enviada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT estimaciones_enviada_por_fkey FOREIGN KEY (enviada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: estimaciones estimaciones_integrada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT estimaciones_integrada_por_fkey FOREIGN KEY (integrada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: estimaciones estimaciones_reemplaza_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimaciones
    ADD CONSTRAINT estimaciones_reemplaza_a_fkey FOREIGN KEY (reemplaza_a) REFERENCES public.estimaciones(id) ON DELETE SET NULL;


--
-- Name: finiquitos finiquitos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finiquitos
    ADD CONSTRAINT finiquitos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: finiquitos finiquitos_elaborado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finiquitos
    ADD CONSTRAINT finiquitos_elaborado_por_fkey FOREIGN KEY (elaborado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: finiquitos finiquitos_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finiquitos
    ADD CONSTRAINT finiquitos_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: bitacora_notas fk_bitacora_notas_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_notas
    ADD CONSTRAINT fk_bitacora_notas_tipo FOREIGN KEY (tipo) REFERENCES public.bitacora_nota_tipos(clave);


--
-- Name: garantia_endosos fk_garantia_endosos_convenio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia_endosos
    ADD CONSTRAINT fk_garantia_endosos_convenio FOREIGN KEY (convenio_id) REFERENCES public.convenios_modificatorios(id);


--
-- Name: pagos fk_pagos_estimacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT fk_pagos_estimacion FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id);


--
-- Name: garantia_endosos garantia_endosos_garantia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia_endosos
    ADD CONSTRAINT garantia_endosos_garantia_id_fkey FOREIGN KEY (garantia_id) REFERENCES public.contrato_garantias(id) ON DELETE CASCADE;


--
-- Name: garantia_endosos garantia_endosos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia_endosos
    ADD CONSTRAINT garantia_endosos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: instruccion_pago instruccion_pago_estimacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruccion_pago
    ADD CONSTRAINT instruccion_pago_estimacion_id_fkey FOREIGN KEY (estimacion_id) REFERENCES public.estimaciones(id) ON DELETE CASCADE;


--
-- Name: instruccion_pago instruccion_pago_instruida_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruccion_pago
    ADD CONSTRAINT instruccion_pago_instruida_por_fkey FOREIGN KEY (instruida_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: instruccion_pago instruccion_pago_presupuesto_anual_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruccion_pago
    ADD CONSTRAINT instruccion_pago_presupuesto_anual_id_fkey FOREIGN KEY (presupuesto_anual_id) REFERENCES public.presupuesto_anual(id) ON DELETE SET NULL;


--
-- Name: minutas minutas_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minutas
    ADD CONSTRAINT minutas_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: minutas minutas_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minutas
    ADD CONSTRAINT minutas_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: minutas minutas_registrada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.minutas
    ADD CONSTRAINT minutas_registrada_por_fkey FOREIGN KEY (registrada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: pagos pagos_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: pagos pagos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: plan_amortizacion plan_amortizacion_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amortizacion
    ADD CONSTRAINT plan_amortizacion_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: presupuesto_anual presupuesto_anual_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_anual
    ADD CONSTRAINT presupuesto_anual_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: presupuesto_anual presupuesto_anual_dependencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuesto_anual
    ADD CONSTRAINT presupuesto_anual_dependencia_id_fkey FOREIGN KEY (dependencia_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: programa_obra programa_obra_contrato_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_obra
    ADD CONSTRAINT programa_obra_contrato_concepto_id_fkey FOREIGN KEY (contrato_concepto_id) REFERENCES public.contrato_conceptos(id) ON DELETE CASCADE;


--
-- Name: programa_obra programa_obra_contrato_periodo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_obra
    ADD CONSTRAINT programa_obra_contrato_periodo_id_fkey FOREIGN KEY (contrato_periodo_id) REFERENCES public.contrato_periodos(id) ON DELETE CASCADE;


--
-- Name: programa_version_celda programa_version_celda_programa_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version_celda
    ADD CONSTRAINT programa_version_celda_programa_version_id_fkey FOREIGN KEY (programa_version_id) REFERENCES public.programa_version(id) ON DELETE CASCADE;


--
-- Name: programa_version_concepto programa_version_concepto_programa_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version_concepto
    ADD CONSTRAINT programa_version_concepto_programa_version_id_fkey FOREIGN KEY (programa_version_id) REFERENCES public.programa_version(id) ON DELETE CASCADE;


--
-- Name: programa_version programa_version_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version
    ADD CONSTRAINT programa_version_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: programa_version programa_version_convenio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa_version
    ADD CONSTRAINT programa_version_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES public.convenios_modificatorios(id);


--
-- Name: usuarios usuarios_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- Name: visitas visitas_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES public.contratos(id) ON DELETE CASCADE;


--
-- Name: visitas visitas_nota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_nota_id_fkey FOREIGN KEY (nota_id) REFERENCES public.bitacora_notas(id);


--
-- Name: visitas visitas_registrada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas
    ADD CONSTRAINT visitas_registrada_por_fkey FOREIGN KEY (registrada_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict LEVOOeonOEl3JlVljRQ5AK9OXa674tHjNSHgsZhbQNoCKMm1JRkPIpVqhq1Va7g

