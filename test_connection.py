import psycopg2
from psycopg2 import OperationalError

def test_db_connection(db_name, db_user, db_password, db_host, db_port):
    connection = None
    try:
        print("Đang thử kết nối đến cơ sở dữ liệu...")
        connection = psycopg2.connect(
            database=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
        )
        print("✅ KẾT NỐI ĐẾN POSTGRESQL THÀNH CÔNG! 🎉")
        
        # Test 1 câu truy vấn nhỏ
        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        record = cursor.fetchone()
        print(f"Phiên bản PostgreSQL đang chạy: {record[0]}")
        
    except OperationalError as e:
        print(f"❌ LỖI KẾT NỐI: {e}")
        print("Vui lòng kiểm tra lại mật khẩu hoặc thông tin đăng nhập.")
    finally:
        if connection:
            connection.close()
            print("Đã đóng kết nối.")

if __name__ == "__main__":
    # LƯU Ý: Vui lòng sửa lại "password" thành mật khẩu PostgreSQL mà bạn đã đặt trên máy.
    # Trong môi trường pgAdmin của mình, nếu bạn dùng mật khẩu khác thì hãy điền vào dưới này nhé.
    test_db_connection(
        db_name="cv_analysis_db",
        db_user="postgres",
        db_password="123123", # ĐIỀN MẬT KHẨU CỦA BẠN VÀO ĐÂY
        db_host="localhost",
        db_port="5432"
    )
