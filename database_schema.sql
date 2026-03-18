--
-- PostgreSQL database dump
--
-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-02-23 21:14:45

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 872 (class 1247 OID 16414)
-- Name: danh_muc_skill_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.danh_muc_skill_enum AS ENUM (
    'TECHNICAL',
    'SOFT',
    'LANGUAGE',
    'TOOL'
);


ALTER TYPE public.danh_muc_skill_enum OWNER TO postgres;

--
-- TOC entry 875 (class 1247 OID 16424)
-- Name: loai_yeu_cau_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loai_yeu_cau_enum AS ENUM (
    'REQUIRED',
    'PREFERRED'
);


ALTER TYPE public.loai_yeu_cau_enum OWNER TO postgres;

--
-- TOC entry 866 (class 1247 OID 16396)
-- Name: trang_thai_cv_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trang_thai_cv_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'DONE',
    'FAILED'
);


ALTER TYPE public.trang_thai_cv_enum OWNER TO postgres;

--
-- TOC entry 869 (class 1247 OID 16406)
-- Name: trang_thai_result_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.trang_thai_result_enum AS ENUM (
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public.trang_thai_result_enum OWNER TO postgres;

--
-- TOC entry 863 (class 1247 OID 16390)
-- Name: vai_tro_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.vai_tro_enum AS ENUM (
    'CANDIDATE',
    'ADMIN'
);


ALTER TYPE public.vai_tro_enum OWNER TO postgres;

--
-- TOC entry 229 (class 1255 OID 16601)
-- Name: fn_check_completed_state(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_check_completed_state() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.trang_thai = 'COMPLETED' AND (NEW.diem_tong IS NULL OR NEW.chi_tiet_diem IS NULL) THEN
        RAISE EXCEPTION 'Không thể chuyển sang COMPLETED khi diem_tong hoặc chi_tiet_diem còn NULL';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_check_completed_state() OWNER TO postgres;

--
-- TOC entry 230 (class 1255 OID 16603)
-- Name: fn_check_cross_ownership(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_check_cross_ownership() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_cv_user   UUID;
    v_jd_user   UUID;
BEGIN
    SELECT user_id INTO v_cv_user FROM cvs WHERE cv_id = NEW.cv_id;
    SELECT user_id INTO v_jd_user FROM job_descriptions WHERE jd_id = NEW.jd_id;

    IF v_cv_user IS DISTINCT FROM v_jd_user THEN
        RAISE EXCEPTION 'CV và JD phải thuộc cùng một người dùng (cross-ownership violation)';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_check_cross_ownership() OWNER TO postgres;

--
-- TOC entry 228 (class 1255 OID 16596)
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 16544)
-- Name: analysis_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analysis_results (
    result_id uuid DEFAULT gen_random_uuid() NOT NULL,
    cv_id uuid NOT NULL,
    jd_id uuid NOT NULL,
    diem_tong numeric(5,2),
    chi_tiet_diem jsonb,
    goi_y text,
    trang_thai public.trang_thai_result_enum DEFAULT 'PROCESSING'::public.trang_thai_result_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_diem_tong CHECK (((diem_tong IS NULL) OR ((diem_tong >= (0)::numeric) AND (diem_tong <= (100)::numeric))))
);


ALTER TABLE public.analysis_results OWNER TO postgres;

--
-- TOC entry 5125 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE analysis_results; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.analysis_results IS 'Kết quả phân tích AI cho cặp (CV, JD)';


--
-- TOC entry 5126 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN analysis_results.chi_tiet_diem; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.analysis_results.chi_tiet_diem IS 'JSON điểm thành phần: {skill: x, experience: x, education: x, format: x}';


--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN analysis_results.goi_y; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.analysis_results.goi_y IS 'Gợi ý cải thiện CV, định dạng Markdown';


--
-- TOC entry 227 (class 1259 OID 16573)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    log_id bigint NOT NULL,
    actor_id uuid,
    action character varying(10) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    performed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 5128 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'Nhật ký thao tác dữ liệu (INSERT, UPDATE, DELETE)';


--
-- TOC entry 226 (class 1259 OID 16572)
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_log_id_seq OWNER TO postgres;

--
-- TOC entry 5129 (class 0 OID 0)
-- Dependencies: 226
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- TOC entry 223 (class 1259 OID 16508)
-- Name: cv_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cv_skills (
    cv_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    muc_do_thao_tao character varying(50)
);


ALTER TABLE public.cv_skills OWNER TO postgres;

--
-- TOC entry 5130 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE cv_skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.cv_skills IS 'Kỹ năng được thể hiện trong CV (quan hệ N-N)';


--
-- TOC entry 5131 (class 0 OID 0)
-- Dependencies: 223
-- Name: COLUMN cv_skills.muc_do_thao_tao; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cv_skills.muc_do_thao_tao IS 'Beginner | Intermediate | Advanced | Expert';


--
-- TOC entry 220 (class 1259 OID 16451)
-- Name: cvs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cvs (
    cv_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    duong_dan character varying(500) NOT NULL,
    du_lieu_trich_xuat jsonb,
    trang_thai_phan_tich public.trang_thai_cv_enum DEFAULT 'PENDING'::public.trang_thai_cv_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cvs OWNER TO postgres;

--
-- TOC entry 5132 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE cvs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.cvs IS 'Hồ sơ CV do ứng viên tải lên';


--
-- TOC entry 5133 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN cvs.duong_dan; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cvs.duong_dan IS 'Đường dẫn cloud storage (S3, GCS, ...)';


--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN cvs.du_lieu_trich_xuat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cvs.du_lieu_trich_xuat IS 'Dữ liệu NLP đã trích xuất, lưu dạng JSONB';


--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 220
-- Name: COLUMN cvs.trang_thai_phan_tich; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cvs.trang_thai_phan_tich IS 'PENDING → PROCESSING → DONE | FAILED';


--
-- TOC entry 224 (class 1259 OID 16525)
-- Name: jd_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jd_skills (
    jd_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    loai_yeu_cau public.loai_yeu_cau_enum DEFAULT 'REQUIRED'::public.loai_yeu_cau_enum NOT NULL
);


ALTER TABLE public.jd_skills OWNER TO postgres;

--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE jd_skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.jd_skills IS 'Kỹ năng yêu cầu trong JD (quan hệ N-N)';


--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 224
-- Name: COLUMN jd_skills.loai_yeu_cau; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.jd_skills.loai_yeu_cau IS 'REQUIRED: bắt buộc | PREFERRED: ưu tiên';


--
-- TOC entry 221 (class 1259 OID 16475)
-- Name: job_descriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_descriptions (
    jd_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tieu_de character varying(300) NOT NULL,
    ten_cong_ty character varying(200),
    noi_dung text,
    yeu_cau_phan_tich jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_descriptions OWNER TO postgres;

--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE job_descriptions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.job_descriptions IS 'Mô tả vị trí tuyển dụng';


--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN job_descriptions.yeu_cau_phan_tich; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.job_descriptions.yeu_cau_phan_tich IS 'JSON cấu trúc: {required_skills: [], preferred_skills: [], min_experience_years: int, education_level: str}';


--
-- TOC entry 222 (class 1259 OID 16495)
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    skill_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ten_ky_nang character varying(150) NOT NULL,
    danh_muc public.danh_muc_skill_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE skills; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.skills IS 'Danh mục chuẩn hóa kỹ năng';


--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN skills.danh_muc; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.skills.danh_muc IS 'TECHNICAL | SOFT | LANGUAGE | TOOL';


--
-- TOC entry 219 (class 1259 OID 16429)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    ho_ten character varying(200) NOT NULL,
    mat_khau character varying(255) NOT NULL,
    vai_tro public.vai_tro_enum DEFAULT 'CANDIDATE'::public.vai_tro_enum NOT NULL,
    hoat_dong boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Tài khoản người dùng (ứng viên & quản trị viên)';


--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN users.mat_khau; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.mat_khau IS 'Hash bcrypt, cost >= 12. Không lưu mật khẩu gốc.';


--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN users.vai_tro; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.vai_tro IS 'CANDIDATE: ứng viên | ADMIN: quản trị viên';


--
-- TOC entry 4921 (class 2604 OID 16576)
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- TOC entry 4947 (class 2606 OID 16561)
-- Name: analysis_results analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT analysis_results_pkey PRIMARY KEY (result_id);


--
-- TOC entry 4954 (class 2606 OID 16586)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- TOC entry 4943 (class 2606 OID 16514)
-- Name: cv_skills cv_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv_skills
    ADD CONSTRAINT cv_skills_pkey PRIMARY KEY (cv_id, skill_id);


--
-- TOC entry 4929 (class 2606 OID 16469)
-- Name: cvs cvs_duong_dan_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_duong_dan_key UNIQUE (duong_dan);


--
-- TOC entry 4931 (class 2606 OID 16467)
-- Name: cvs cvs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT cvs_pkey PRIMARY KEY (cv_id);


--
-- TOC entry 4945 (class 2606 OID 16533)
-- Name: jd_skills jd_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jd_skills
    ADD CONSTRAINT jd_skills_pkey PRIMARY KEY (jd_id, skill_id);


--
-- TOC entry 4937 (class 2606 OID 16489)
-- Name: job_descriptions job_descriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_descriptions
    ADD CONSTRAINT job_descriptions_pkey PRIMARY KEY (jd_id);


--
-- TOC entry 4939 (class 2606 OID 16505)
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (skill_id);


--
-- TOC entry 4941 (class 2606 OID 16507)
-- Name: skills skills_ten_ky_nang_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_ten_ky_nang_key UNIQUE (ten_ky_nang);


--
-- TOC entry 4925 (class 2606 OID 16450)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4927 (class 2606 OID 16448)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4932 (class 1259 OID 16587)
-- Name: idx_cvs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cvs_user_id ON public.cvs USING btree (user_id);


--
-- TOC entry 4933 (class 1259 OID 16592)
-- Name: idx_gin_cv_trich_xuat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gin_cv_trich_xuat ON public.cvs USING gin (du_lieu_trich_xuat);


--
-- TOC entry 4934 (class 1259 OID 16594)
-- Name: idx_gin_jd_yeu_cau; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gin_jd_yeu_cau ON public.job_descriptions USING gin (yeu_cau_phan_tich);


--
-- TOC entry 4948 (class 1259 OID 16593)
-- Name: idx_gin_result_chi_tiet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gin_result_chi_tiet ON public.analysis_results USING gin (chi_tiet_diem);


--
-- TOC entry 4935 (class 1259 OID 16588)
-- Name: idx_jd_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jd_user_id ON public.job_descriptions USING btree (user_id);


--
-- TOC entry 4949 (class 1259 OID 16589)
-- Name: idx_results_cv_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_results_cv_id ON public.analysis_results USING btree (cv_id);


--
-- TOC entry 4950 (class 1259 OID 16590)
-- Name: idx_results_jd_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_results_jd_id ON public.analysis_results USING btree (jd_id);


--
-- TOC entry 4951 (class 1259 OID 16591)
-- Name: idx_results_trang_thai; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_results_trang_thai ON public.analysis_results USING btree (trang_thai);


--
-- TOC entry 4952 (class 1259 OID 16595)
-- Name: idx_unique_processing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_processing ON public.analysis_results USING btree (cv_id, jd_id) WHERE (trang_thai = 'PROCESSING'::public.trang_thai_result_enum);


--
-- TOC entry 4966 (class 2620 OID 16602)
-- Name: analysis_results trg_check_completed; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_check_completed BEFORE UPDATE ON public.analysis_results FOR EACH ROW EXECUTE FUNCTION public.fn_check_completed_state();


--
-- TOC entry 4967 (class 2620 OID 16604)
-- Name: analysis_results trg_cross_ownership; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cross_ownership BEFORE INSERT ON public.analysis_results FOR EACH ROW EXECUTE FUNCTION public.fn_check_cross_ownership();


--
-- TOC entry 4964 (class 2620 OID 16598)
-- Name: cvs trg_cvs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cvs_updated_at BEFORE UPDATE ON public.cvs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 4965 (class 2620 OID 16599)
-- Name: job_descriptions trg_jd_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_jd_updated_at BEFORE UPDATE ON public.job_descriptions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 4968 (class 2620 OID 16600)
-- Name: analysis_results trg_results_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_results_updated_at BEFORE UPDATE ON public.analysis_results FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 4963 (class 2620 OID 16597)
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- TOC entry 4955 (class 2606 OID 16470)
-- Name: cvs fk_cvs_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cvs
    ADD CONSTRAINT fk_cvs_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 4957 (class 2606 OID 16515)
-- Name: cv_skills fk_cvskill_cv; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv_skills
    ADD CONSTRAINT fk_cvskill_cv FOREIGN KEY (cv_id) REFERENCES public.cvs(cv_id) ON DELETE CASCADE;


--
-- TOC entry 4958 (class 2606 OID 16520)
-- Name: cv_skills fk_cvskill_skill; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv_skills
    ADD CONSTRAINT fk_cvskill_skill FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON DELETE CASCADE;


--
-- TOC entry 4956 (class 2606 OID 16490)
-- Name: job_descriptions fk_jd_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_descriptions
    ADD CONSTRAINT fk_jd_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 4959 (class 2606 OID 16534)
-- Name: jd_skills fk_jdskill_jd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jd_skills
    ADD CONSTRAINT fk_jdskill_jd FOREIGN KEY (jd_id) REFERENCES public.job_descriptions(jd_id) ON DELETE CASCADE;


--
-- TOC entry 4960 (class 2606 OID 16539)
-- Name: jd_skills fk_jdskill_skill; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jd_skills
    ADD CONSTRAINT fk_jdskill_skill FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON DELETE CASCADE;


--
-- TOC entry 4961 (class 2606 OID 16562)
-- Name: analysis_results fk_result_cv; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT fk_result_cv FOREIGN KEY (cv_id) REFERENCES public.cvs(cv_id) ON DELETE CASCADE;


--
-- TOC entry 4962 (class 2606 OID 16567)
-- Name: analysis_results fk_result_jd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT fk_result_jd FOREIGN KEY (jd_id) REFERENCES public.job_descriptions(jd_id) ON DELETE RESTRICT;


--
-- TOC entry 5117 (class 0 OID 16544)
-- Dependencies: 225
-- Name: analysis_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5116 (class 0 OID 16451)
-- Dependencies: 220
-- Name: cvs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5118 (class 3256 OID 16605)
-- Name: cvs policy_cvs_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_cvs_owner ON public.cvs USING ((user_id = (current_setting('app.current_user_id'::text, true))::uuid));


--
-- TOC entry 5119 (class 3256 OID 16606)
-- Name: analysis_results policy_results_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY policy_results_owner ON public.analysis_results USING ((cv_id IN ( SELECT cvs.cv_id
   FROM public.cvs
  WHERE (cvs.user_id = (current_setting('app.current_user_id'::text, true))::uuid))));


-- Completed on 2026-02-23 21:14:46

--
-- PostgreSQL database dump complete
--

\unrestrict KxEpG1z4rOBgNfLrpUqFpLiaFI7ZrbyE2T8HziFqiy3AeCBhyPyBmKzhyZU9hNp

