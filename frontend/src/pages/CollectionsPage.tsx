/*
 * Copyright 2024 Sony Semiconductor Solutions Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useState, useEffect } from "react";

import PageLayout from "../components/layout/PageLayout";
import Collections from "../components/collections/Collections"
import useHttpNotifications from "../hooks/use-http-notifications";

const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST ? process.env.REACT_APP_BACKEND_HOST : "";


const CollectionsPage = () => {
  const { sendRequest } = useHttpNotifications();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);


  useEffect(() => {
    setLoading(true);
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/collection/list`,
      },
      (data: string[]) => {
        setCollections(data);
        setLoading(false);
      },
      false
    );
  }, [sendRequest]);


  const addCollection = async (name: string) => {    
    const formData = new FormData();
    formData.append("collection_name", name);
    
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/collection/list`,
        method: 'POST',
        data: formData
      },
      () => {
        setCollections((prev) => [...prev, { collection_name: name, n_images: "0" }]);
      }
    );
  }

  const editCollection = async (name: string, new_name: string) => {
    const formData = new FormData();
    formData.append("new_collection_name", new_name);
    
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/collection/list/${name}`,
        method: 'PUT',
        data: formData
      },
      () => {
        setCollections((prev) => 
          prev.map((coll) => 
            coll.collection_name === name ? { ...coll, collection_name: new_name } : coll
          )
        );
      }
    );
  }

  const deleteCollection = async (name: string) => {
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/collection/list/${name}`,
        method: 'DELETE'
      },
      () => {
        setCollections((prev) => prev.filter((coll) => coll.collection_name !== name));
      }
    );
  }

  const downloadCollection = async (name: string) => {
    try {
      const response = await fetch(`${BACKEND_HOST}/api/collection/download/${name}`);
      const blob = await response.blob();

      const anchorElement = document.createElement("a");
      anchorElement.href = URL.createObjectURL(blob);
      anchorElement.download = `${name}.zip`;
      anchorElement.click();

      URL.revokeObjectURL(anchorElement.href);
      anchorElement.remove();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <PageLayout>
      <Collections 
        loading={loading}
        collections={collections}
        onAdd={addCollection}
        onEdit={editCollection}
        onDelete={deleteCollection}
        onDownload={downloadCollection}
      />
    </PageLayout>
  );
};

export default CollectionsPage;