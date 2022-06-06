const tss = require("tss-lib");
const { expose } = require('threads/worker')
expose({
    random_bigint() {
        return tss.random_bigint();
    },
    generate_keys(index) {
        return tss.generate_keys(index);
    },
    generator() {
        return tss.generator();
    },
    scalar_mul(pt, k) {
        return tss.scalar_mul(pt, k);
    },
    coords_to_pt(pt_x, pt_y) {
        return tss.coords_to_pt(pt_x, pt_y);
    },
    phase_1_broadcast(gamma_i) {
        return tss.phase_1_broadcast(gamma_i);
    },
    message_A(k_i, ek, dlog_statement) {
        return tss.message_A(k_i, ek, dlog_statement);
    },
    message_Bs(gamma_i, w_i, ek, msgA, dlog_statement) {
        return tss.message_Bs(gamma_i, w_i, ek, msgA, dlog_statement);
    },
    message_Alphas(k_i, gamma_i, w_i, keys, gwis, m_b_gammas, m_b_ws, beta_gammas, beta_wis, index, parties) {
        return tss.message_Alphas(k_i, gamma_i, w_i, keys, gwis, m_b_gammas, m_b_ws, beta_gammas, beta_wis, index, parties);
    },
    phase_3_deltaInv(delta_is) {
        return tss.phase_3_deltaInv(delta_is);
    },
    get_b_proof(m_b_gamma) {
        return tss.get_b_proof(m_b_gamma);
    },
    phase_4_Di_verify(coms, D_is, D_i_blinds, b_proofs, delta_inv, index, parties) {
        return tss.phase_4_Di_verify(coms, D_is, D_i_blinds, b_proofs, delta_inv, index, parties);
    },
    phase_5_Rki(R, k_i, m_as, m_a_randoms, h1h2Ntildes, keys, index, parties) {
        return tss.phase_5_Rki(R, k_i, m_as, m_a_randoms, h1h2Ntildes, keys, index, parties);
    },
    phase_5_verify(R_k_is, eks, msgAs, proofs, proofs_R_k_i, h1h2Ntilde, R, index, parties) {
        return tss.phase_5_verify(R_k_is, eks, msgAs, proofs, proofs_R_k_i, h1h2Ntilde, R, index, parties);
    },
    phase_6_Rsigmai(R, sigma_i) {
        return tss.phase_6_Rsigmai(R, sigma_i);
    },
    phase_6_verify(S_is, y) {
        return tss.phase_6_verify(S_is, y);
    },
    phase_7_sign(msg_hash, k_i, R, sigma_i, y) {
        return tss.phase_7_sign(msg_hash, k_i, R, sigma_i, y);
    },
    get_signature(y, msg_hash, R, local_sig_sis) {
        return tss.get_signature(y, msg_hash, R, local_sig_sis);
    },
})