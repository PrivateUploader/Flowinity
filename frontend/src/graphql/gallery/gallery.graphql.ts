import { gql } from "@apollo/client";

export const GalleryQuery = gql`
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
        id
        createdAt
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
        }
        starred {
          id
          userId
          attachmentId
        }
      }
    }
  }
`;
