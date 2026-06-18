import logging
import uuid
from app.config.supabase_client import supabase
from app.config.settings import settings

logger = logging.getLogger("uvicorn.error")

def ensure_bucket_exists():
    bucket_name = settings.SUPABASE_BUCKET_NAME
    try:
        # Check if bucket exists
        buckets = supabase.storage.list_buckets()
        exists = any(b.id == bucket_name for b in buckets)
        if not exists:
            logger.info(f"Storage bucket '{bucket_name}' does not exist. Creating...")
            # Create a public bucket so that image URLs can be accessed publicly
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            logger.info(f"Storage bucket '{bucket_name}' created successfully.")
    except Exception as e:
        logger.warning(
            f"Failed to verify/create storage bucket '{bucket_name}': {e}. "
            "If using standard anon key, you may need to create the bucket manually in the Supabase console."
        )

def upload_image_to_supabase(file_content: bytes, file_name: str, content_type: str) -> str:
    """
    Uploads a file to Supabase Storage bucket and returns the public URL.
    """
    ensure_bucket_exists()
    
    # Generate unique filename to avoid collisions
    ext = file_name.split(".")[-1] if "." in file_name else "jpg"
    unique_name = f"{uuid.uuid4()}.{ext}"
    bucket_name = settings.SUPABASE_BUCKET_NAME
    
    # Upload binary content
    supabase.storage.from_(bucket_name).upload(
        path=unique_name,
        file=file_content,
        file_options={"content-type": content_type}
    )
    
    # Retrieve public URL
    public_url = supabase.storage.from_(bucket_name).get_public_url(unique_name)
    return public_url
