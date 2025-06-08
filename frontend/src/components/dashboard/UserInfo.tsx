type Props = {
  user: {
    fullName: string;
    email: string;
    role: string;
  };
};

export function UserInfo({ user }: Props) {
  return (
    <section className="space-y-2">
      <p>
        <strong>Имя:</strong> {user.fullName}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Роль:</strong> {user.role}
      </p>
    </section>
  );
}
