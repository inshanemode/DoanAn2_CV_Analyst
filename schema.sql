
CREATE TABLE users (
	user_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	ho_ten VARCHAR(200) NOT NULL, 
	mat_khau VARCHAR(255) NOT NULL, 
	vai_tro VARCHAR(50) NOT NULL, 
	hoat_dong BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (user_id)
)

;


CREATE TABLE cvs (
	cv_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	user_id UUID NOT NULL, 
	duong_dan VARCHAR(500) NOT NULL, 
	du_lieu_trich_xuat JSONB, 
	trang_thai_phan_tich VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (cv_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE CASCADE, 
	UNIQUE (duong_dan)
)

;


CREATE TABLE job_descriptions (
	jd_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	user_id UUID NOT NULL, 
	tieu_de VARCHAR(300) NOT NULL, 
	ten_cong_ty VARCHAR(200), 
	noi_dung TEXT, 
	yeu_cau_phan_tich JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (jd_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE CASCADE
)

;


CREATE TABLE skills (
	skill_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	ten_ky_nang VARCHAR(150) NOT NULL, 
	danh_muc VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (skill_id)
)

;


CREATE TABLE cv_skills (
	cv_id UUID NOT NULL, 
	skill_id UUID NOT NULL, 
	muc_do_thao_tao VARCHAR(50), 
	PRIMARY KEY (cv_id, skill_id), 
	FOREIGN KEY(cv_id) REFERENCES cvs (cv_id) ON DELETE CASCADE, 
	FOREIGN KEY(skill_id) REFERENCES skills (skill_id) ON DELETE CASCADE
)

;


CREATE TABLE jd_skills (
	jd_id UUID NOT NULL, 
	skill_id UUID NOT NULL, 
	loai_yeu_cau VARCHAR(50) NOT NULL, 
	PRIMARY KEY (jd_id, skill_id), 
	FOREIGN KEY(jd_id) REFERENCES job_descriptions (jd_id) ON DELETE CASCADE, 
	FOREIGN KEY(skill_id) REFERENCES skills (skill_id) ON DELETE CASCADE
)

;


CREATE TABLE analysis_results (
	result_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	cv_id UUID NOT NULL, 
	jd_id UUID NOT NULL, 
	diem_tong NUMERIC(5, 2), 
	chi_tiet_diem JSONB, 
	goi_y TEXT, 
	trang_thai VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (result_id), 
	FOREIGN KEY(cv_id) REFERENCES cvs (cv_id) ON DELETE CASCADE, 
	FOREIGN KEY(jd_id) REFERENCES job_descriptions (jd_id) ON DELETE RESTRICT
)

;

