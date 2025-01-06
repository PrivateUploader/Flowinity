import { gql } from "@apollo/client/core";

const GalleryQuery = gql`
  query Gallery($input: GalleryInput!) {
    gallery(input: $input) {
      pager {
        totalItems
        currentPage
        pageSize
        totalPages
        startPage
        endPage
        startIndex
        endIndex
      }
      items {
        autoCollectApproval {
          id
          autoCollectRuleId
        }
        id
        createdAt
        location
        updatedAt
        attachment
        userId
        name
        originalFilename
        type
        fileSize
        deletable
        textMetadata
        user {
          username
          id
          avatar
        }
        collections {
          id
          name
        }
        item {
          id
          pinned
          collectionId
        }
        starred {
          id
          userId
          attachmentId
        }
        flagged
      }
    }
  }
`;

const DeleteUploadMutation = gql`
  mutation DeleteUploads($input: DeleteUploadInput!) {
    deleteUploads(input: $input) {
      success
    }
  }
`;

const UpdateUploadMutation = gql`
  mutation UpdateUpload($input: UpdateUploadInput!) {
    updateUpload(input: $input) {
      id
    }
  }
`;
