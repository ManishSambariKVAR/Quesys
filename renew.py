import subprocess
import logging
import os

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def generate_self_signed_cert(cert_path, key_path, days_valid=365):
    try:
        cert_dir = os.path.dirname(cert_path)

        if not os.path.exists(cert_dir):
            os.makedirs(cert_dir)

        logging.info("Generating a new private key...")
        subprocess.run(["openssl", "genrsa", "-out", key_path, "2048"], check=True)

        logging.info("Generating a new self-signed certificate...")
        subprocess.run(
            [
                "openssl",
                "req",
                "-new",
                "-x509",
                "-key",
                key_path,
                "-out",
                cert_path,
                "-days",
                str(days_valid),
                "-subj",
                "/CN=localhost",
            ],
            check=True,
        )

        logging.info(f"Self-signed certificate generated successfully: {cert_path}")
        logging.info(f"Private key generated successfully: {key_path}")

    except subprocess.CalledProcessError as e:
        logging.error(f"An error occurred while generating the certificate: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")

if __name__ == "__main__":

    cert_path = r"C:\Users\Admin\Desktop\KVAR\Token Display1\localhost.pem"
    key_path = r"C:\Users\Admin\Desktop\KVAR\Token Display1\localhost-key.pem"
    validity_days = 365

    generate_self_signed_cert(cert_path, key_path, validity_days)