import configparser
import os
import shutil
from typing import Dict, List, Optional


class CollectionConfig:
    def __init__(self):
        self.collection_dir = f"{os.getenv('MODLIB_HOME', os.path.expanduser('~/.modlib'))}/collections"
        os.makedirs(self.collection_dir, exist_ok=True)

        self.config_file = os.path.join(self.collection_dir, "collections.cfg")
        self.config = configparser.ConfigParser()

        # Read current config file & create if not exist
        if os.path.exists(self.config_file):
            self.config.read(self.config_file)
        else:
            with open(self.config_file, "w") as configfile:
                self.config.write(configfile)

    def add_collection(
        self,
        collection_name: str,
    ):
        """Add a new image collection to the configuration file."""
        if self.config.has_section(collection_name):
            raise ValueError(f"A collection with the name '{collection_name}' already exists.")

        save_dir = os.path.join(self.collection_dir, collection_name)
        os.makedirs(save_dir, exist_ok=True)

        self.config.add_section(collection_name)
        self.config.set(collection_name, "collection_name", collection_name)

        with open(self.config_file, "w") as configfile:
            self.config.write(configfile)

    def delete_collection(self, collection_name: str):
        """Delete a collection from the configuration file."""
        if not self.config.has_section(collection_name):
            raise ValueError(f"No collection with the name '{collection_name}' exists.")

        # Remove collection directory
        shutil.rmtree(f"{self.collection_dir}/{collection_name}")

        self.config.remove_section(collection_name)
        with open(self.config_file, "w") as configfile:
            self.config.write(configfile)

    def list_collections(self) -> List[Dict[str, str]]:
        """List all available collections."""
        collections_list = []
        for section in self.config.sections():
            collection_name = section
            collection_directory = os.path.join(self.collection_dir, collection_name)
            if not os.path.exists(collection_directory) or not os.path.isdir(collection_directory):
                raise ValueError("Collection directory not found.")

            n_images = len([f for f in os.listdir(collection_directory) if f.lower().endswith(".jpeg")])

            collection_info = {"collection_name": section, "n_images": str(n_images)}
            collections_list.append(collection_info)
        return collections_list

    def update_collection(self, collection_name, new_collection_name: Optional[str] = None):
        """Update existing collection configuration."""
        if not self.config.has_section(collection_name):
            raise ValueError(f"No collection with the name '{collection_name}' exists.")

        if new_collection_name and (new_collection_name != collection_name):
            if self.config.has_section(new_collection_name):
                raise ValueError(f"A collection with name '{new_collection_name}' already exists.")

            old_collection_dir = os.path.join(self.collection_dir, collection_name)
            new_collection_dir = os.path.join(self.collection_dir, new_collection_name)

            self.config.set(collection_name, "collection_name", new_collection_name)
            self.config[new_collection_name] = self.config[collection_name]
            self.config.remove_section(collection_name)
            shutil.move(old_collection_dir, new_collection_dir)

        # Save updated configuration to file
        with open(self.config_file, "w") as configfile:
            self.config.write(configfile)
