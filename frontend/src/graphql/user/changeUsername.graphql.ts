import { gql } from "@apollo/client";

export const ChangeUsernameMutation = gql`
  mutation ChangeUsername($input: ChangeUsernameInput!) {
    changeUsername(input: $input)
  }
`;

export const ChangeUserPasswordMutation = gql`
  mutation ChangeUserPassword($input: ChangePasswordInput!) {
    changeUserPassword(input: $input)
  }
`;
